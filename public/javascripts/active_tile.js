/**
 * In V3 it is quite hard to gain access to Projection and Panes.
 * This is a helper class
 * @param {google.maps.Map} map
 */
var ProjectionHelperOverlay = function(map) {
  google.maps.OverlayView.call(this);
  this.set_map(map);
};

ProjectionHelperOverlay.prototype = new google.maps.OverlayView();
ProjectionHelperOverlay.prototype.draw = function () {
  if (!this.ready) {
    this.ready = true;
    google.maps.event.trigger(this, 'ready');
  }
};

google.maps.Map.prototype.getTiles = function() {
  var container = this.getPanesContainer();
  for(var i = 0; i < container.childNodes.length; i++) {
    if(!container.childNodes[i].id.match(/^pane_/)) {
      return container.childNodes[i].childNodes[0].childNodes;
    }
  }
  return [];
};

google.maps.Map.prototype.isTileVisible = function(tile) {
  var container = this.getPanesContainer();

  var tile_top = parseInt(tile.style.top);
  var tile_left = parseInt(tile.style.left);

  var container_top, container_left, transform;
  if(transform = container.style.MozTransform || container.style.webkitTransform) {
    var xy = /\(.*\)/.exec(transform)[0].slice(1, -1).split(", ").slice(-2);
    container_top = parseInt(xy[1]);
    container_left = parseInt(xy[0]);
  } else {
    container_top = parseInt(container.style.top);
    container_left = parseInt(container.style.left);
  }

  tile_top = tile_top + container_top;
  tile_left = tile_left + container_left;
  var tile_bottom = tile_top + 256; //tile.firstElementChild.offsetHeight;
  var tile_right = tile_left + 256; //tile.firstElementChild.offsetWidth;

  //main map container to get width and height
  var parent = container.parentNode;

  return ( ( tile_top > 0 && tile_top < parent.offsetHeight ) ||
           ( tile_bottom > 0 && tile_bottom < parent.offsetHeight ) ) && 
         ( ( tile_left > 0 && tile_left < parent.offsetWidth) ||
           ( tile_right > 0 && tile_right < parent.offsetWidth) );
};

google.maps.Map.prototype.getPanesContainer = function() {
  return this.getDiv().childNodes[0].childNodes[0];
};

google.maps.Map.prototype.getVisibleTiles = function() {
  var tiles = this.getTiles();
  var visible_tiles = []
  for(var i = 0; i < tiles.length; i++) {
    if(this.isTileVisible(tiles[i])) 
      visible_tiles.push(tiles[i]);
  }

  return visible_tiles;
};

// activetile.TileOverlay()
//
// Class for inserting tiles on the map.

var activetile = activetile || {};

activetile.TileOverlay = function(options) {
  this.options = options;
  this.parentTile = options.tile;
  this.onTileLoad = options.onTileLoad || function() {};
  this.onTileLoaded = options.onTileLoaded || function() {};

  if(this.parentTile) {
    this.x = parseInt(this.parentTile.style.left);
    this.y = parseInt(this.parentTile.style.top);
  }
  this.set_map(options.map);

  var self = this;
  google.maps.event.addListener(this, 'ready', function() {
    self.onTileLoad(self);
  });
};

activetile.TileOverlay.prototype = new google.maps.OverlayView();

activetile.TileOverlay.prototype.draw = function() {
  if (!this.ready) {
    this.ready = true;
    google.maps.event.trigger(this, 'ready');
  }
  
  // Check if the div has been created.
  var div = this.div_;
  if (!div) {
    div = this.div_ = document.createElement('DIV');
    div.style.position = "absolute";
    div.className = "tileOverlay";
    if(this.options.className)
      div.className += " " + this.options.className;

    var img = new Image();
    var self = this;
    img.onload = function() {
      self.loaded = true;
      self.onTileLoaded();
    }
    this.image = img;

    img.src = this.getUrl();
    div.appendChild(img);

    // Then add the overlay to the DOM
    var panes = this.get_panes();
    panes.overlayLayer.appendChild(div);
  }

  // Position the overlay 
//  var point = this.get_projection().fromLatLngToDivPixel(this.latlng_);
  div.style.left = this.x + 'px';
  div.style.top = this.y + 'px';
};

activetile.TileOverlay.prototype.getArgs = function() {

  var projection = this.get_projection();  var north_west = projection.fromDivPixelToLatLng(new google.maps.Point(this.x, this.y));
  var south_east = projection.fromDivPixelToLatLng(new google.maps.Point(this.x + 256, this.y + 256));
  var args = [];
  args.push("area[lat1]=" + north_west.lat());
  args.push("area[lat2]=" + south_east.lat());
  args.push("area[lng1]=" + north_west.lng());
  args.push("area[lng2]=" + south_east.lng());
  args.push("zoom=" + this.map.get_zoom());

  args = args.join("&");

  return args;
};

activetile.TileOverlay.prototype.getUrl = function() {
  var url = this.options.url;
  var args = this.getArgs();

  if(url.match(/\?/)) {
    url += "&" + args;
  } else {
    url += "?" + args;
  }

  return url;
};

activetile.TileOverlay.prototype.remove = function() {
  // Check if the overlay was on the map and needs to be removed.
  if (this.div_) {
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
  }
};

activetile.TileOverlay.prototype.get_position = function() {
 return this.latlng_;
};

activetile.TileOverlay.prototype.getParentTile = function() {
  return this.parentTile;
};
var activetile = activetile || {};

activetile.SpatialMap = function(opts) {
  opts = opts || {};
  this.cellSize = opts.cellSize || 16;

  this.map = {};
};

activetile.SpatialMap.prototype.clear = function() {
  delete(this.map);
  this.map = {};
};

activetile.SpatialMap.prototype.add = function(point) {
  var x = this.getBase(point.x);
  var y = this.getBase(point.y);

  this.set(x, y, point);
};

activetile.SpatialMap.prototype.get = function(x, y) {
  x = this.getBase(x);
  y = this.getBase(y);

  var key = x + "x" + y;

  return this.map[key];
};

activetile.SpatialMap.prototype.getAllFromNeighbourhood = function(x, y) {
  var points = [];
  points = points.concat( this.get(x, y) || [] );
  points = points.concat( this.get(x - 16, y - 16) || [] );
  points = points.concat( this.get(x, y - 16) || [] );
  points = points.concat( this.get(x + 16, y - 16) || [] );
  points = points.concat( this.get(x + 16, y) || [] );
  points = points.concat( this.get(x + 16, y + 16) || [] );
  points = points.concat( this.get(x, y + 16) || [] );
  points = points.concat( this.get(x - 16, y + 16) || [] );
  points = points.concat( this.get(x - 16, y) || [] );

  return points;
};

activetile.SpatialMap.prototype.set = function(x, y, point) {
  var arr;
  if(arr = this.get(x, y)) {
    arr.push(point);
  } else {
    var key = x + "x" + y;
    this.map[key] = [point];
  }
};

activetile.SpatialMap.prototype.getBase = function(a) {
  var sign = a < 0 ? -1 : 1;
  var base = Math.abs(a) - (Math.abs(a) % this.cellSize);
  base = base * sign;

  return base;
};
//  activetile.ActivityLayer is a class that will keep points visible on tiles
//  and provide interaction with them
//
//  Point is any object that responds to x and y
//

var activetile = activetile || {};

activetile.ActivityLayer = function(opts) {
  opts = opts || {};
  this.points = [];
  this.map = opts.map;
  this.pointRadius = 5;
  this.mouseOverPoint = opts.mouseOverPoint || function() {};
  this.mouseBeyondPoint = opts.mouseBeyondPoint || function() {};

  this.registerEvents();

  this.spatialMap = new activetile.SpatialMap(opts.cellSize || 16);
};

activetile.ActivityLayer.prototype.pointOnCursor = function(x, y, point) {
  var r = this.pointRadius;
  return x < point.x + r && x > point.x - r && y < point.y + r && y > point.y - r;
}

activetile.ActivityLayer.prototype.clearPoints = function() {
  this.points = [];
  this.spatialMap.clear();
};

activetile.ActivityLayer.prototype.onPoint = function(x, y) {
  var points = this.spatialMap.getAllFromNeighbourhood(x, y);

  if(points) {
    for(var i = 0; i < points.length; i++) {
      if(this.pointOnCursor(x, y, points[i])) {
        return points[i];
      }
    }
  }

  return false;
};

activetile.ActivityLayer.prototype.registerEvents = function() {
  var self = this;
  google.maps.event.addListener(this.map, "tilesloaded", function() {
    if(self.eventsRegistered) 
      return;

    self.activeElement = this.getPanesContainer();
    self.onMouseMove = function(event) {
      var x = event.pageX;
      var y = event.pageY;
      
      var top, left;
      if(transform = this.style.MozTransform || this.style.webkitTransform) {
        var xy = /\(.*\)/.exec(transform)[0].slice(1, -1).split(", ").slice(-2);
        top = parseInt(xy[1]);
        left = parseInt(xy[0]);
      } else {
        top =  parseInt(this.style.top);
        left = parseInt(this.style.left);
      }

      x -= left;
      y -= top;

      if(self.map.getDiv()) {
        // must subtract margin and padding of map (only if map is available)
        x -= self.map.getDiv().offsetLeft;
        y -= self.map.getDiv().offsetTop;
      }

      var point;
      if(point = self.onPoint(x, y)) {
        self.activeElement.style.cursor = 'pointer';
        var center = new google.maps.Point(point.x + left, point.y + top);
        self.mouseOverPoint(self, point, center);
      } else {
        self.activeElement.style.cursor = 'auto';
        self.mouseBeyondPoint(self);
      }
    }

    self.activeElement.addEventListener("mousemove", self.onMouseMove, false);
    self.eventsRegistered = true;
  });
};

activetile.ActivityLayer.prototype.addPoint = function(point, tile) {
  if(tile) {
    // point is given with tile we should transform its coords
    point.x += tile.x;
    point.y += tile.y;
  }

  this.points.push(point);
  this.spatialMap.add(point);
};


// DataMap - tiles with data that can be added to google map
// 
// Params:
// * hash:
//   * map - instance of Map
//   * tilesUrl - url of tile that will be converted to tile with bounds, ie:
//                url?lat1=...&lat2=...&lng1=...&lng2=...&zoom=...
//
//                Default: /tiles
//
//   * onTileLoad - function that will be called after each tile load

var activetile = activetile || {};

activetile.DataMap = function(options) {
  var self = this;
  // load defaults
  options = options || {};
  this.tilesUrl = options.tilesUrl || "/tiles";
  this.onTileLoad = options.onTileLoad || function() {};
  this.onTilesReload = options.onTilesReload || function() {};
  this.onTilesRemove = options.onTilesRemove || function() {};
  this.map = options.map;
  this.loadQueue = [];
  this.concurrentLoads = options.concurrentLoads || 0;

  // allow user to add requests which can be stopped after removeTiles()
  this.requests = [];

  this.tiles = [];
  this.tilesLoaders = []

  this.projectionHelper = new ProjectionHelperOverlay(this.map);
  google.maps.event.addListener(this.projectionHelper, 'ready', function(){
      self.projection = this.get_projection();
  });
};

activetile.DataMap.prototype.showTiles = function() {
  var self = this;
  this.tilesLoaders.push(google.maps.event.addListener(this.map, "tilesloaded", function() { self.updateTiles(); }));
  this.tilesLoaders.push(google.maps.event.addListener(this.map, "dragend", function() { self.updateTiles(); }));
  this.tilesLoaders.push(google.maps.event.addListener(this.map, "zoom_changed", function() {
        if(self.map.getDiv().childNodes[0])
          self.zoomChanged(); 
  }));
  this.updateTiles();
};

activetile.DataMap.prototype.zoomChanged = function() {
  this.onTilesReload();
  this.removeTiles();
  this.updateTiles();
};

activetile.DataMap.prototype.isTileLoaded = function(tileDiv) {
  for(var i = 0; i < this.tiles.length; i++) {
    if(tileDiv == this.tiles[i].getParentTile())
      return true;
  }
  return false;
};

activetile.DataMap.prototype.loadingTiles = function() {
  var loadingTiles = []
  for(var i = 0; i < this.tiles.length; i++) {
    if(!this.tiles[i].loaded) {
      loadingTiles.push(this.tiles[i]);
    }
  }
  return loadingTiles;
};

activetile.DataMap.prototype.process = function() {
  var length = this.loadingTiles().length;
  var toLoad;
  if(this.concurrentLoads == 0) {
    toLoad = 10000;
  } else {
    toLoad = this.concurrentLoads - length;
  }

  while(toLoad > 0 && this.loadQueue.length > 0) {
    var opts = this.loadQueue.shift();
    if(opts) {
      var tile = new activetile.TileOverlay(opts);
      tile.set_map(this.map);
      this.tiles.push(tile);
    }
    toLoad -= 1;
  }
};

activetile.DataMap.prototype.isTileEnqueued = function(tile) {
  for(var i = 0; i < this.loadQueue.length; i++) {
    if(this.loadQueue[i].tile == tile) {
      return true;
    }
  }
  return false;
};

activetile.DataMap.prototype.queue = function(opts) {
  if(!this.isTileLoaded(opts.tile) && !this.isTileEnqueued(opts.tile)) {
    this.loadQueue.push(opts);
  }
  this.process();
};

activetile.DataMap.prototype.updateTiles = function(opts) {
  opts = opts || {};
  var tiles = this.map.getVisibleTiles();

  var self = this;
  for(var i = 0; i < tiles.length; i++) {
    if(!this.isTileLoaded(tiles[i])) {
      this.queue({
        tile: tiles[i], 
        url: this.tilesUrl, 
        onTileLoad: this.onTileLoad, 
        onTileLoaded: function() { self.process(); }
      });
    }
  }
};

activetile.DataMap.prototype.hideTiles = function() {
  if(this.tilesLoaders) {
    for(var i = 0; i < this.tilesLoaders.length; i++) {
      google.maps.event.removeListener(this.tilesLoaders[i]);
    }
  }
  this.removeTiles();
};

activetile.DataMap.prototype.removeTiles = function() {
  for(var i = 0; i < this.tiles.length; i++) {
    var tile = this.tiles[i];
    tile.set_map(null);
  }
  this.tiles = [];
  this.onTilesRemove();
  this.abortRequests();
};

activetile.DataMap.prototype.abortRequests = function() {
  for(var i = 0; i < this.requests.length; i++) {
    this.requests[i].abort();
  }
  this.requests = [];
};


var activetile = activetile || {};

activetile.DataMapManager = function(options) {
  options = options || {};
  this.data_maps = {};
  this.createFunction = options.createFunction;
};

activetile.DataMapManager.prototype.add = function(name, options) {
  this.data_maps[name] = this.createFunction(name);
};

activetile.DataMapManager.prototype.get = function(name) {
  return this.data_maps[name];
};

activetile.DataMapManager.prototype.remove = function(name) {
  this.data_maps[name] = null;
};


