var map = L.map('map', {
    'center': [15, 47],
    'zoom': 3,
    'layers': [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            'attribution': 'Map data &copy; OpenStreetMap contributors'
        })
    ]
});

var datapath = 'https://radiosonde.mah.priv.at/data-dev/';
var summary = datapath + 'summary.geojson';

var geojsonMarkerOptions = {
    radius: 8,
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};

marker_chroma = {
    "BUFR": chroma.scale(['yellow', '008ae5']),
    "netCDF": chroma.scale(['yellow', 'red', 'black'])
}

path_colors = {
    "simulated": {
        color: 'DarkOrange'
    },
    "origin": {
        color: 'MediumBlue'
    }
}

function drawpath(geojson, l) {
    // record for later, and maybe a skewt on click
    //l.sourceTarget.feature.properties.ascents[0].data = geojson;
    var path_source = geojson.properties.path_source;

    var lineCoordinate = [];
    for (var i in geojson.features) {
        var pointJson = geojson.features[i];
        var coord = pointJson.geometry.coordinates;
        lineCoordinate.push([coord[1], coord[0]]);
    }
    L.polyline(lineCoordinate, path_colors[path_source]).addTo(map);
}

function mouseover(l) {
    var ascents = l.target.ascents;

    for (var i in ascents) {
        var a = ascents[i];
        if (!a.hasOwnProperty('data')) {
            var p = datapath + a.path;
            l.index = i;
            $.getJSON(p,
                (function(site) {
                    return function(geojson) {
                        site.target.ascents[site.index].data = geojson;
                        drawpath(geojson, site);
                    };
                }(l))
            );
        } else {
            // console.log("data for ",i,"already loaded:", a.data);
        }
    }
}

function clicked(l) {
    let ctx = document.getElementById("chart");
}

function findBUFR(value, index, array) {
    return (value.source === "BUFR");
}

function findnetCDF(value, index, array) {
    return (value.source === "netCDF");
}

$.getJSON(summary, function(data) {
    L.geoJson(data, {

        pointToLayer: function(feature, latlng) {
            let now = Math.floor(Date.now() / 1000);
            let ascents = feature.properties.ascents;

            // prefer BUFR over netCDF
            // ascents are sorted descending by syn_timestamp
            // both netCDF either/or BUFR-derived ascents with same syn_timestamp
            // may be present.
            // BUFR-derived ascents are better quality data so prefer them.
            // we keep the netCDF-derived ascents of same timestamp around
            // to check how good the trajectory simulation is
            var newest_bufr = ascents.find(findBUFR);
            var newest_netcdf = ascents.find(findnetCDF);
            if (!newest_bufr && !newest_netcdf)
                return;

            if (newest_bufr && newest_netcdf &&
                (newest_bufr.syn_timestamp) ==
                (newest_netcdf.syn_timestamp)) {
                a = [newest_bufr, newest_netcdf];
            }
            else {
                if (newest_bufr)
                    a = [newest_bufr];
                else
                    a = [newest_netcdf];
            }
            var primary = a[0];
            var ts = primary.syn_timestamp;

            var age_hrs = (now - ts) / 3600;
            // 0..maxHrs
            var age_index = Math.round(Math.min(age_hrs, maxHrs - 1));
            age_index = Math.max(age_index, 0);
            var rounded_age = Math.round(age_hrs * 10) / 10;

            geojsonMarkerOptions.fillColor = marker_chroma[primary.source].(age_index/maxHrs);

            var marker = L.circleMarker(latlng, geojsonMarkerOptions);
            marker.ascents = a;
            var content = "<b>" + feature.properties.name + "</b>" + "<br>  " + rounded_age + " hours old";

            // console.log(primary.source + 'CSSClass');
            marker.bindTooltip(content, {className: primary.source + 'CSSClass'}).openTooltip()
                .on('click', clicked)
                .on('mouseover', mouseover);

            return marker;
        }
    }).addTo(map);
});
