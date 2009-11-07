(function($) {


  // DOM ready
  $(function() {

    // we are in /add - display map for adding locations
    $("#map.add").each(function() {
      var myLatlng = new google.maps.LatLng(53.230515, -1.832264);
      var myOptions = { zoom: 6, center: myLatlng,  mapTypeId: google.maps.MapTypeId.ROADMAP };
      var map = new google.maps.Map(this, myOptions);

      google.maps.event.addListener(map, 'click', function(event) {
        var place = event.latLng;
        var marker = new google.maps.Marker({
          position: place,
          map: map
        });

        $.post("/add/"+place.lat()+"/"+place.lng());
      });
    });


    // we are in index, display tiles!
    $("#map.index").each(function() {
      var myLatlng = new google.maps.LatLng(53.230515, -1.832264);
      var myOptions = { zoom: 6, center: myLatlng,  mapTypeId: google.maps.MapTypeId.ROADMAP };
      var map = new google.maps.Map(this, myOptions);

      var tooltip = $('<div class="dotTooltip"></div>').hide().appendTo(document.body);
      var activityLayer = new activetile.ActivityLayer({
        map: map, 
        mouseOverPoint: function(self, point, center) {
          var html = "<strong>Id:</strong> " + point.id;
          tooltip.css({left: center.x + 15 + map.getDiv().offsetLeft, top: center.y + 15 + map.getDiv().offsetTop}).html(html).show();
      }, mouseBeyondPoint: function(self) {
          tooltip.hide();
      }});

      var dotsMap = new activetile.DataMap({
        concurrentLoads: 1, // load only one Tile concurrently - it's better for server as generating tiles is heavy process
        tilesUrl: "/places.png", 
        map: map,
        onTilesReload: function() {
          activityLayer.clearPoints();
        },
        onTileLoad: function(tile) {
          var request = $.ajax({
            url: "/places.json?" + tile.getArgs(),
            dataType: "json",
            type: "GET",
            success: function(data, textStatus) {
              for(var i = 0; i < data.length; i++) {
                activityLayer.addPoint(data[i], tile);
              }
            }
          });
          dotsMap.requests.push(request);
        },
        onTilesRemove: function() {
          activityLayer.clearPoints();
        }
      });

      google.maps.event.addListener(map, "tilesloaded", function() {
        dotsMap.showTiles();
      });
    });
  });



})(jQuery);
