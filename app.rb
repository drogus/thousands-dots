require 'rubygems'
require 'sinatra'
require 'datamapper'
require 'dotter'

DataMapper.setup(:default, "sqlite3://#{Dir.pwd}/dots.sqlite3")

class Place
  include DataMapper::Resource
  property :id, Serial

  property :latitude, BigDecimal, :precision => 15, :scale => 12
  property :longitude, BigDecimal, :precision => 15, :scale => 12

  attr_accessor :x, :y
  def color
    colors = ["#000000", "#ff0000", "#00ff00", "#0000ff"]
    colors[rand(colors.length)]
  end

  def self.in_area(area, extended = false)
    lat1, lat2 = area[:lat1].to_f, area[:lat2].to_f
    lng1, lng2 = area[:lng1].to_f, area[:lng2].to_f

    # if first of each coordinates is greater than the second, swap them
    lat1, lat2 = lat2, lat1 if lat1 > lat2
    lng1, lng2 = lng2, lng1 if lng1 > lng2

    # if we need to get also points from near neighbourhood
    if extended
      lat_margin = (lat1 - lat2).abs / 10.0
      lng_margin = (lng1 - lng2).abs / 10.0
      lat1 -= lat_margin
      lat2 += lat_margin
      lng1 -= lng_margin
      lng2 += lng_margin
    end

    all(:latitude.gte => lat1, :latitude.lte => lat2, :longitude.gte => lng1, :longitude.lte => lng2)
  end
end

DataMapper.auto_upgrade!

get '/add' do
  haml :add
end

post '/add/:latitude/:longitude' do
  place = Place.create(:latitude => "%.12f" % params[:latitude], :longitude => "%.12f" % params[:longitude])
  if place.id.nil?
    raise place.inspect
  end
  nil
end

get '/places:format' do
  tile = Dotter::Tile.new(Dotter::LatLng.new(params[:area][:lat1], params[:area][:lng1]), params[:zoom])
  # get places, extended == true only if we are generating png, more info in tutorial
  places = Place.in_area(params[:area], params[:format] == ".png")
  tile.locations = places
  # let's fill x and y coordinates for each location
  tile.generate_xy_coordinates!

  case params[:format]
  when ".json":
    content_type("application/json")
    places.map { |place| {:id => place.id, :x => place.x, :y => place.y } }.to_json
  when ".png":
    content_type("image/png")
    tile.image.to_blob
  end
end

get '/' do
  haml :index
end

__END__

@@ layout
!!! Strict
%html
  %head
    %script{ :type => "text/javascript", :src => "http://maps.google.com/maps/api/js?sensor=false" }
    %script{ :type => "text/javascript", :src => "/javascripts/jquery.js" }
    %script{ :type => "text/javascript", :src => "/javascripts/active_tile.js" }
    %script{ :type => "text/javascript", :src => "/javascripts/application.js" }
    %link{ :href => "/stylesheets/style.css", :type => "text/css", :rel => "stylesheet" }
  %body 
    = yield

@@ add
#map.add{ :style => "width: 100%; height: 100%;" }

@@ index
#map.index{ :style => "width: 100%; height: 100%;" }
