import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Guid } from 'guid-typescript';

import { Lugar } from '../../models/lugar.interface';
import { SocketService } from '../../services/socket.service';


@Component({
  selector: 'app-maps',
  templateUrl: './maps.component.html',
  styleUrls: ['./maps.component.css']
})
export class MapsComponent implements OnInit {
  @ViewChild('map', { static: true }) mapElement: ElementRef;
  map: google.maps.Map;
  markers: google.maps.Marker[] = [];
  infoWindows: google.maps.InfoWindow[] = [];
  lugares: Lugar[] = [];

  // lugares: Lugar[] = [
  //   {
  //     nombre: 'Udemy',
  //     lat: 37.784679,
  //     lng: -122.395936
  //   },
  //   {
  //     nombre: 'Bahía de San Francisco',
  //     lat: 37.798933,
  //     lng: -122.377732
  //   },
  //   {
  //     nombre: 'The Palace Hotel',
  //     lat: 37.788578,
  //     lng: -122.401745
  //   }
  // ];


  constructor(private http: HttpClient, public socket: SocketService) { }

  ngOnInit() {
    // obtiene la lista de los empleados suscritos al socket
    this.http.get('http://localhost:3000/mapas').subscribe((res: Lugar[]) => {
      this.lugares = res;
      this.loadMap();
    });

    this.listenSockets();

  }

  listenSockets() {
    this.socket.listen('new-marker').subscribe((marker: Lugar) => {
      this.addMarker(marker);
    });

    this.socket.listen('remove-marker').subscribe((id: string) => {
      for (const i in this.markers) {
        if (this.markers[i].getTitle() === id) {
          this.markers[i].setMap(null);
          const index = this.markers.indexOf(this.markers[i]);
          this.markers.slice(index, 1);
        }
      }
    });

    this.socket.listen('update-marker').subscribe((location: any) => {

      const toUpdate = this.markers.find(marker => marker.getTitle() === location.id);
      const latlng = new google.maps.LatLng(location.lat, location.lng);
      toUpdate.setPosition(latlng);
    });
  }

  loadMap() {
    const latLng = new google.maps.LatLng(37.79, -122.40);
    const mapOptions: google.maps.MapOptions = {
      center: latLng,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

    this.map.addListener('click', (coors: any) => {

      const newMarker: Lugar = {
        nombre: 'new place',
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        id: Guid.create().toString()
      };

      this.addMarker(newMarker);
      this.socket.emit('new-marker', newMarker);
    });

    for (const lugar of this.lugares) {
      this.addMarker(lugar);
    }
  }



  addMarker(place: Lugar) {
    const latlng = new google.maps.LatLng(place.lat, place.lng);

    const marker = new google.maps.Marker(
      {
        map: this.map,
        animation: google.maps.Animation.DROP,
        position: latlng,
        draggable: true,
        title: place.id,
      }
    );

    this.markers.push(marker);

    const infoContent = `<b>${place.nombre}</b>`;
    const infoWindow = new google.maps.InfoWindow({
      content: infoContent
    });

    this.infoWindows.push(infoWindow);

    google.maps.event.addDomListener(marker, 'click', () => {
      this.infoWindows.forEach(info => info.close());
      infoWindow.open(this.map, marker);
    });


    google.maps.event.addDomListener(marker, 'dblclick', (coors) => {
      marker.setMap(null);
      this.socket.emit('remove-marker', place.id);
    });

    google.maps.event.addDomListener(marker, 'drag', (coors: any) => {
      const actual = {
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        nombre: place.nombre,
        id: place.id
      };

      this.socket.emit('update-marker', actual);
    });

  }
}
