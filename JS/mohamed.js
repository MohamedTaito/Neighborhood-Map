// declare the global variables
var map;
var infoWindow;
var bounds;

// google maps initialize
function initMap() {
    var Cairo = {
        lat: 30.044420,
        lng: 31.235712
    };
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: Cairo,
        styles: styles,
        mapTypeControl: false
    });

    infoWindow = new google.maps.InfoWindow();

    bounds = new google.maps.LatLngBounds();

    ko.applyBindings(new ViewModel());

}

// map error handler
function openNav() {
    document.getElementById("mySidenav").style.width = "250px";
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
}

// data in Model
var ModelMarker = function(data) {
    var self = this;

    this.title = data.title;
    this.position = data.location;
    this.street = '',
    this.city = '',
    this.phone = '';

    this.visible = ko.observable(true);

    // Style the markers
    var defaultIcon = makeMarkerIcon('0091ff');
    // mouses over the marker.
    var highlightedIcon = makeMarkerIcon('FFFF24');

    var clientID = '3ZTDTM1FKEYCEOOL4ZVPUOWUZEEZNI4SU2BY1AIQPZOR2LDA';
    var clientSecret = 'IMSENNPNQQXT5RRGJNADQK14AF2XB5COSWALRPNTUCAQETMD';

    // call foursquare api
    var reqURL = 'https://api.foursquare.com/v2/venues/search?ll=' + this.position.lat + ',' + this.position.lng + '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20160118' + '&query=' + this.title;

    $.getJSON(reqURL).done(function(data) {
		var results = data.response.venues[0];
        self.street = results.location.formattedAddress[0] ? results.location.formattedAddress[0]: 'N/A';
        self.city = results.location.formattedAddress[1] ? results.location.formattedAddress[1]: 'N/A';
        self.phone = results.contact.formattedPhone ? results.contact.formattedPhone : 'N/A';
    }).fail(function() {
        alert('Error with foursquare');
    });

    // Create a marker , and put into markers array
    this.marker = new google.maps.Marker({
        position: this.position,
        title: this.title,
        animation: google.maps.Animation.DROP,
        icon: defaultIcon
    });

    self.filterMarkers = ko.computed(function () {
        // showListings
        if(self.visible() === true) {
            self.marker.setMap(map);
            bounds.extend(self.marker.position);
            map.fitBounds(bounds);
        } else {
            self.marker.setMap(null);
        }
    });

    // Create an onclick even to open an infowindow
    this.marker.addListener('click', function() {
        populateInfoWindow(this, self.street, self.city, self.phone, infoWindow);
        toggleBounce(this);
        map.panTo(this.getPosition());
    });

    // change the colors.
    this.marker.addListener('mouseover', function() {
        this.setIcon(highlightedIcon);
    });
    this.marker.addListener('mouseout', function() {
        this.setIcon(defaultIcon);
    });

    // show item info when selected from list
    this.show = function(location) {
        google.maps.event.trigger(self.marker, 'click');
    };

    // creates bounce effect when item selected
    this.bounce = function(place) {
		google.maps.event.trigger(self.marker, 'click');
	};

};

// View Model
var ViewModel = function() {
    var self = this;

    this.searchItem = ko.observable('');

    this.mapList = ko.observableArray([]);

    // add marker for each location
    locations.forEach(function(location) {
        self.mapList.push( new ModelMarker(location) );
    });

    // locations viewed on map
    this.locationList = ko.computed(function() {
        var searchFilter = self.searchItem().toLowerCase();
        if (searchFilter) {
            return ko.utils.arrayFilter(self.mapList(), function(location) {
                var str = location.title.toLowerCase();
                var result = str.includes(searchFilter);
                location.visible(result);
				return result;
			});
        }
        self.mapList().forEach(function(location) {
            location.visible(true);
        });
        return self.mapList();
    }, self);
};

// Handling possible errors from google API
function googleAPIError() {
    alert("Opps There is An Error in Map!!");
}

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, street, city, phone, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // Clear the infowindow content.
        infowindow.setContent('');
        infowindow.marker = marker;

        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        var streetViewService = new google.maps.StreetViewService();
        var radius = 40;

        var windowContent = '<h4>' + marker.title + '</h4>' +
            '<p>' + street + "<br>" + city + '<br>' + phone + "</p>";

        // In case the status is OK, which means the pano was found, compute the
        // position of the streetview image, then calculate the heading, then get a
        // panorama from that and set the options
        var getStreetView = function (data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                    nearStreetViewLocation, marker.position);
                infowindow.setContent(windowContent + '<div id="pano"></div>');
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 20
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                    document.getElementById('pano'), panoramaOptions);
            } else {
                infowindow.setContent(windowContent + '<div style="color: red">No Street View Found</div>');
            }
        };
        // Use streetview service to get the closest streetview image
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        // Open the infowindow on the correct marker.
        infowindow.open(map, marker);
    }
}

function toggleBounce(marker) {
  if (marker.getAnimation() !== null) {
    marker.setAnimation(null);
  } else {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
        marker.setAnimation(null);
    }, 1400);
  }
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
        '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34));
    return markerImage;
}
