$(window).load(initPage);
var dev = false;
var settings = {
        alerts : { playSound: false },
        load: { type: "rest" }, // rest || ws (websocket)
        ws : {
            endpoint : ""
        },
        rest : {
            refresh : { auto: true, rate: 7000 },
            loadAlertPath : (dev ? "http://localhost:8080/" :"https://snmpdashboard-cyborgcorp.rhcloud.com/") + "alerts",
            closeAlertPath : (dev ? "http://localhost:8080/" :"https://snmpdashboard-cyborgcorp.rhcloud.com/") + "alerts/id/close/",
            updateAlertPath : (dev ? "http://localhost:8080/" :"https://snmpdashboard-cyborgcorp.rhcloud.com/") + "alerts/id/update/"
        }
    };

var loadAlertInterval = null;
var loadAlertWebSocket = null;

var pageView = null;

var searchParams = null;

function initPage() {
    //alert(moment("2013-03-02T17:35:09.616Z"));
    
    // Init menu options
    $("#nav-recent").click(function(){
        changePageView("unseen");
    });
    $("#nav-resolved").click(function(){
        changePageView("closed");
    });
    $("#nav-all").click(function(){
        changePageView("all");
    });
    
    $("#warning").click(function(){
        $("#warning").fadeOut("fast");
    });
    
    initLoadAlertSequence();
}

function initLoadAlertSequence() {
    
    if(settings.load.type === 'rest') {
        // Reset the interval
        if(loadAlertInterval !== null) {
            clearInterval(loadAlertInterval);
            loadAlertInterval = null;
        }
    
        if(settings.rest.refresh.auto) {
            if(pageView !== "closed")
            {
                loadAlertInterval = setInterval(loadAlertsRest, settings.rest.refresh.rate);
            }
        }
        
        // Do first load
        if(pageView === null) {
            loadAlertsRest({status: "unseen"});
            pageView = "unseen";
        }

    }
    else if(settings.load.type === 'ws') {
        loadAlertWebSocket = new WebSocket(settings.ws.endpoint); // TBD
        
        loadAlertWebSocket.onopen = function () {
            // connection is opened and ready to use
        };
    
        loadAlertWebSocket.onerror = function (error) {
            // an error occurred when sending/receiving data
        };
    
        loadAlertWebSocket.onmessage = function (message) {
            try {                
            } 
            catch (e) {
                console.log('This doesn\'t look like a valid JSON: ', message.data);
                return;
            }
            
            // handle incoming message
        };        
    }
}

function loadAlertsRest(query) {
                
    // Make params
    var params = "";
    if((query !== null) && (typeof(query) != "undefined")) {
        params = "?" + $.param(query, true);
    }
    else
    {
        if(pageView == "unseen"){
            query = {status: "unseen"};
            params = "?" + $.param(query, true);
        }
    }
    
    // Apply search params if any
    if(searchParams !== null){
        
        if(!((query !== null) && (typeof(query) != "undefined"))) {
            query = {};
        }
        
        if(searchParams.value && (searchParams.value !== "")){
            query.value = searchParams.value;
        }
        if(searchParams.dscr && (searchParams.dscr !== "")){
            query.dscr = searchParams.dscr;
        }
        if(searchParams.server && (searchParams.server !== "")){
            query.server = searchParams.server;
        }
        if(searchParams.prty && (searchParams.prty !== "")){
            query.prty = searchParams.prty;
        }
        
        params = "?" + $.param(query, true);
    }
    

    
    // Ajax call for data
    console.log(settings.rest.loadAlertPath);
	$.ajax({
		url: settings.rest.loadAlertPath + params,
		dataType: "json",
		success: function (data) {
			//alert(data);
            //$("#activity-data").val(JSON.stringify(data));
			showAlerts(data);

		},
		error: function () {
			// 
            showWarning("There were problems trying to get alerts from the server.");
		}
	});	
            
}

function resolveAlertRest(id) {
        
    $.ajax({
        type: "POST",
		url: restPathWithId(settings.rest.closeAlertPath, id),
		dataType: "http",
        statusCode: {
            200: function(){
                $("#alert-" + id).slideToggle("fast", function(){$("#alert-" + id).remove();});
            },
            500: function(){
                showWarning("There were problems trying to resolve this alert.");
            }
        }

	});	    
}

function submitSearch(){
    searchParams = {};
    
    if($("#search-name").val() !== ""){
        searchParams.value = $("#search-name").val();
    }
    if($("#search-desc").val() !== ""){
        searchParams.dscr = $("#search-desc").val();
    }
    if($("#search-server").val() !== ""){
        searchParams.server = $("#search-server").val();
    }
    if($("#search-prty").val() !== ""){
        searchParams.prty = $("#search-prty").val();
    }
        
    changePageView(pageView);
}

function resetSearch(){
    if (searchParams !== null)
    {
        $("#search-name").val("");    
        $("#search-desc").val("");    
        $("#search-server").val("");    
        $("#search-prty").val("");
    
        searchParams = null;
        
        changePageView(pageView);
    }
}

function showAddComment(id){
    
}

function commentAlertRest(id, comment){
    
}

function changePageView(view) {
    
    pageView = view;

    $("#alertList").html("&nbsp;");
    
    // Reset all menu options
    $("#nav-recent").attr("class", "");
    $("#nav-resolved").attr("class", "");
    $("#nav-all").attr("class", "");
    
    if(view === "unseen") {
        $("#nav-recent").attr("class", "selected");
        loadAlertsRest({status: "unseen"});        
    }
    else if(view === "closed") {
        $("#nav-resolved").attr("class", "selected");
        loadAlertsRest({status: "closed"});
    }
    else if(view === "all") {
        $("#nav-all").attr("class", "selected");
        loadAlertsRest();
    }
    
    initLoadAlertSequence();

}

function showAlerts(data) {
    
    if(typeof(data) != "undefined") {
        
        var alertsInserted = 0;
                
        $.each(data, function (index, value) {
            
            if(!$("#alert-" + value._id).length) {
                
                alertsInserted++;
                
                $("#alertTemplate").tmpl(value).prependTo("#alertList");
                
            }
            
        });
        
        if(alertsInserted > 0) {
            //alert("play sound");
            playSound("new-alerts");
        }
        else
        {   
            if($('div[id*="alert-"]').length === 0) {
                $("#emptyTemplate").tmpl({}).prependTo("#alertList");
            }
        }
        
    }
    
}

function playSound(reason) {    
    if (settings.alerts.playSound) {
        
        if(reason === "new-alerts") {
            $("#audio-high").get(0).play();
        }
             
    }
}

function restPathWithId(path, id){
    return path.replace("id", id);
}

function showWarning(text){
    $("#warning").html(text);
    
    if(!$("#warning").is(":visible")){
        $("#warning").fadeIn("fast");
    }
}

function formatISODate(strDate)
{
    return moment(strDate).format("MM/DD/YYYY HH:mm:ss");
}
