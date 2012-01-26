/*******************************************************************************************
* Use, Study, Remix & Share under the MIT license
*******************************************************************************************/

/*******************************************************************************************
* Global Variables
*******************************************************************************************/
var fragmentURI;
var fullFragment;
var scriptURI;
var narrativeSequence;
var narrativeNode = false;
var nodeArray;
var scenes;
var sceneCnt = 0;
var sceneURIs;
var sceneScripts;
var mode;
var lastMode;
var recordHistory = false;
var documentCalled = false;
var docURL;
var forceHash;
var nodeVisible = false;
var hvWidth = 825;
var hvHeight = "auto";
var alreadyCalled = false;
var sceneCalled = false;
var currentHotspot;
var video;
var tmpVid;
var sctxt;
var timeoutID;
var timeoutDoc;
var pop;
var results;
var vItems = 10;
var hItems = 10;
var resultContainerWidth;
var resultContainerHeight;
var vGridUnit;
var hGridUnit;
var targetRatio;

/*******************************************************************************************
* Document Ready & Loaded --> Load Structure --> 
*******************************************************************************************/

$(document).ready(function() {
	$("body").append('<div id="loading"></div>');
	parseURI();
	loadMain();
});
$(window).load(function() {
	var tmpHistory = localStorage.getItem("recordHistory");
	if (tmpHistory == "true" && top == self) {
		recordHistory = true;
		$("#history #recordBtn").addClass('active');
		updateHistory();
	} else {
		redrawHistory();
	}
	
	$("#loading").hide();
});

function loadMain() {
	loadStructure();
	loadNew(sceneURIs[0], sceneScripts[0]);
}

/*******************************************************************************************
* Load Structure XML
*******************************************************************************************/
function loadStructure() {
	$.ajax({
		type: "GET",
		url: "structure.xml",
		dataType: "xml",
		async: false,
		success: function(structure) {
			var tmpSequence = $(structure).find('narrativeSequence[id='+narrativeSequence+']');
			scenes = tmpSequence.children('videoScene').length;
			sceneURIs = new Array();
			sceneScripts = new Array();
			tmpSequence.children('videoScene').each(function() {
				sceneURIs.push($(this).attr('src'));
				sceneScripts.push($(this).attr('data-timeline-sources'));
			});
			if (tmpSequence.children('narrativeNode[direction=after]').length) {
				narrativeNode = true;
				var nodeAfter = tmpSequence.children('narrativeNode[direction=after]').attr('destinationSequences');
				nodeArray = nodeAfter.split(",");
			} else {
				narrativeNode = false;
			}
		}
	});
}

/*******************************************************************************************
* Load Video & execute everything ;-)
*******************************************************************************************/
function loadNew(fragment, script) {
	if (fragment.indexOf("#") != -1) {
		fullFragment = fragment;
		var fooFrag = fullFragment.split("#");
		fragmentURI = fooFrag[0];
	} else {
		fragmentURI = fragment;
	}
	scriptURI = script;
	
	if (documentCalled) {
		history.replaceState("", "withDocument", "?document="+docURL+"&sequence="+narrativeSequence+"&scene="+fullFragment+"");
	} else {
		history.replaceState("", "withScene", "?sequence="+narrativeSequence+"&scene="+fullFragment+"");
	}
	if (forceHash) {
		location.hash = forceHash;
	}
	
	$("#mainContainer").children().remove();
	$("#mainContainer").append('<div id="resultContainer"></div>');
	buildGrid();
	buildInterface();
	//loadContents(scriptURI);
	loadVideo(fragmentURI, scriptURI);
	
	$.when(loadContents(scriptURI)).done(function() {
		var tmpStorage = localStorage.getItem("lastMode");
		if (tmpStorage != null) {
			if (results > 0) {
				setViewMode(tmpStorage);
			} else if (tmpStorage == "fullscreen") {
				setViewMode(tmpStorage);
			} else if (tmpStorage == "circular" || tmpStorage == "timeline") {
				setViewMode("timeline");
			}
		} else if (results > 0) {
			setViewMode("circular");
		} else {
			setViewMode("timeline");
		}
	});
}

/*******************************************************************************************
* Build Empty Grid
*******************************************************************************************/	
function buildGrid(){
	var vCount = 1;
	var hCount = 1;
	for (v=0; v<vItems; v++){
		$("#resultContainer").append('<div class="v'+vCount+'"></div>');
		hCount = 1;
		for (h=0; h<hItems; h++){
			$(".v"+vCount+"").append('<div class="box h'+hCount+'"></div>');
			hCount++;
		};
		vCount++;
	};
};

/*******************************************************************************************
* Build Interface (Add required elements to the DOM)
*******************************************************************************************/	
function buildInterface(){
	$("#resultContainer").append('<div id="connectionContainer"></div>');
	$("#resultContainer").append('<div id="hypervideo"></div>');
	
	var controls = $('<div id="controls"></div>')
	controls.append('<div id="progressContainer"><div id="progress"></div></div>');
	controls.append('<img id="fwPlayBtn" src="./_img/fwPlayWhite.gif"/>');
	controls.append('<img id="pauseBtn" src="./_img/pauseBtnWhite.gif"/>');
	controls.append('<div id="segmentContainer"></div>');
	controls.append('<div id="currentTime">00:00</div>');
	controls.append('<img id="circularScreenBtn" src="./_img/circularScreen.gif"/>');
	controls.append('<img id="timelineScreenBtn" src="./_img/timelineScreen.gif"/>');
	controls.append('<img id="fullscreenBtn" src="./_img/fullscreenWhite.gif"/>');
	$("#resultContainer").after(controls);
	
	if (scenes > 1) {
		for (var i=0; i<scenes; i++) {
			$("#segmentContainer").append('<div class="segment" data-scene-uri="'+sceneURIs[i]+'"><div class="segmentProgress"></div></div>');
		}
	}
	
	var docDetail = $('<div id="documentDetail"></div>');
	docDetail.append('<div id="document"><img src=""/></div>');
	var docOptions = $('<div id="options"></div>');
	docOptions.append('<div id="closeDocumentBtn">×</div>');
	docOptions.append('<input type="text" id="documentURL" value="http://document.url/#hash"/>');
	docOptions.appendTo(docDetail);
	docDetail.appendTo($("#mainContainer"));

	$("#resultContainer").append('<img id="showNodesAfter" src="./_img/nextNodes.gif"/>');

	var timeline = $('<div id="timelineView"></div>');
	timeline.append('<div id="timeline"></div>');
	timeline.append('<img id="timelineBackBtn" src="./_img/timelineBack.gif"/>');
	timeline.append('<img id="timelineFwdBtn" src="./_img/timelineFwd.gif"/>');
	$("#mainContainer").append(timeline);
	$("#mainContainer").after('<div id="nodeConnections"></div>');
	var history = $('<div id="history"></div>');
	history.append('<div id="recordBtn">◉</div>');
	history.append('<div id="deleteBtn">✖</div>');
	$("#mainContainer").after(history);
};

/*******************************************************************************************
* Main Function to fill the boxes (generated by the buildGrid-Function)
* 1. GET the contents
* 2. The current logic starts at Grid-Coordinate currentV*currentH, 
*    checks if the boxes on top, right, bottom or left are empty and appends the 
*    Content-Object
* 3. What we get is a circular structure that fills objects from the center, 
*    rather than from top-left to bottom-right
* The boxes that are filled with empty divs are a bad workaround for layout's sake
*******************************************************************************************/
var loadContents = function(scriptURI){	
	var resultID = 0;
	var categoryCnt = 1;
	var currentID;
	var currentV = 5;
	var currentH = 5;
	var currentBox = $(".v"+currentV+" .h"+currentH+"");
	var rightBox = $(".v"+currentV+" .h"+(currentH+1)+"");
	var topBox = $(".v"+(currentV-1)+" .h"+currentH+"");
	var leftBox = $(".v"+currentV+" .h"+(currentH-1)+"");
	var bottomBox = $(".v"+(currentV+1)+" .h"+currentH+"");
	
	var rightCnt = 0;
	var topCnt = 0;
	var leftCnt = 0;
	var bottomCnt = 0;
	
	var limit = 1;
	var path;
	var catCnt = 1;
	
	// Fill inner Space with empty DIVs
	var c = 0;
	var maxInner = 40;
	for (c; c <= maxInner; c++){
				
		rightBox = $(".v"+currentV+" .h"+(currentH+1)+"");
		topBox = $(".v"+(currentV-1)+" .h"+currentH+"");
		leftBox = $(".v"+currentV+" .h"+(currentH-1)+"");
		bottomBox = $(".v"+(currentV+1)+" .h"+currentH+"");			
		
		var obj = $('<div class="empty"></div>');

		if (c == 0) {
			obj.appendTo(currentBox);
		}
		
		else if (rightBox.children().size() < 1 && rightCnt < limit-1){
		    currentH++;
		    obj.appendTo(".v"+currentV+" .h"+currentH+"");
		    rightCnt++;
		    bottomCnt = 0;
		}
			
		else if (topBox.children().size() < 1 && topCnt < limit-2){
		    currentV--;
		    obj.appendTo(".v"+currentV+" .h"+currentH+"");
		    topCnt++;
		    rightCnt = 0;
		}
		
		else if (leftBox.children().size() < 1 && leftCnt < limit-1){
		    currentH--;
		    obj.appendTo(".v"+currentV+" .h"+currentH+"");
		    leftCnt++;
		    topCnt = 0;
		}	
		
		else if (bottomBox.children().size() < 1 && bottomCnt < limit-1){
		    currentV++;
		    obj.appendTo(".v"+currentV+" .h"+currentH+"");
		    leftCnt = 0;
		    rightCnt++;
		}

		categoryCnt++;
		limit = Math.sqrt(categoryCnt);
	}

	// Get documents for current video and place them around the video frame
	$.ajax({
		type: "GET",
		url: scriptURI,
		dataType: "xml",
		async: false,
		success: function(timeline) {
		$(timeline).find('documents').children('resource').each(function(){
			currentID = $(this).attr('id');
			var tmpIn = toSeconds($(timeline).find('hypervideo[resourceid='+currentID+']').attr('in'));
			$(this).children('document').each(function(){
				rightBox = $(".v"+currentV+" .h"+(currentH+1)+"");
				topBox = $(".v"+(currentV-1)+" .h"+currentH+"");
				leftBox = $(".v"+currentV+" .h"+(currentH-1)+"");
				bottomBox = $(".v"+(currentV+1)+" .h"+currentH+"");
				
				var targetID = $(this).attr('target');
				var targetSrc = $(this).attr('src');
				var obj = $('<img style="opacity:0.3;" class="outerResult '+currentID+'" src="'+targetSrc+'"/>');
				obj.attr('data-order', resultID);
				obj.click(function () {
					docURL = $(this).attr('src');
					if ($(this).hasClass('clickable') && !$(this).hasClass('active')) {
        				openDocument(docURL);
        				$(".clickable").removeClass('active');
        				$(this).addClass('active');
        				clearTimeout(timeoutID);
						return false;
					} else if ($(this).hasClass('active')) {
        				$('#documentDetail').hide();
        				$(this).removeClass('active');
						return false;
					}
					if (alreadyCalled) {
						$('#documentDetail').hide();
						clearTimeout(timeoutID);
						continuePlay(currentHotspot);
					}
					if (window.location.hash == '#t='+Math.ceil(tmpIn)+'') {
						$('#documentDetail').hide();
						accessTime();
					} else {
						$('#documentDetail').hide();
						window.location.hash = 't='+Math.ceil(tmpIn)+'';
					}
					documentCalled = true;
					timeoutDoc = setTimeout('openDocument(docURL)', 2000);
					$(this).addClass('active');
					video.play();
				});

				
				if (rightBox.children().size() < 1 && rightCnt < limit-1){
				    currentH++;
				    obj.appendTo(".v"+currentV+" .h"+currentH+"");
				    rightCnt++;
				    bottomCnt = 0;
				}
					
				else if (topBox.children().size() < 1 && topCnt < limit-1.9){
				    currentV--;
				    obj.appendTo(".v"+currentV+" .h"+currentH+"");
				    topCnt++;
				    rightCnt = 0;
				}
				
				else if (leftBox.children().size() < 1 && leftCnt < limit-1){
				    currentH--;
				    obj.appendTo(".v"+currentV+" .h"+currentH+"");
				    leftCnt++;
				    topCnt = 0;
				}	
				
				else if (bottomBox.children().size() < 1 && bottomCnt < limit-1){
				    currentV++;
				    obj.appendTo(".v"+currentV+" .h"+currentH+"");
				    leftCnt = 0;
				    rightCnt++;
				} else {
					alert("I couldn't find a BOX!! :-(");
				}
				
				resultID++;
				categoryCnt++;
				limit = Math.sqrt(categoryCnt);
				
				// stop filling when maximum is reached (20 boxes in current layout)
				if (resultID == 20) {
					return false;
				}
			});
		});
		}
	});
	results = resultID;
};

/*******************************************************************************************
* Find resources and generate the Target-Divs for Popcorn & Markers inside Progress-Bar
*******************************************************************************************/
function generateTargets(){
	var timelineSrc = $("#video").attr("data-timeline-sources");
	$.ajax({
		type: "GET",
		url: timelineSrc,
		dataType: "xml",
		async: false,
		success: function(timeline) {
		
		$(timeline).find('resources').children().each(function(){
		
			var targetID = $(this).attr('target');
			var tmpIn = $(this).attr('in');
			var tmpOut = $(this).attr('out');
			var targetIn = toSeconds(tmpIn);
			var targetOut = toSeconds(tmpOut);
			var markerLeft = 100 * (targetIn / video.duration);
			var markerWidth = 100 * ((targetOut-targetIn) / video.duration);
			var targetTop = $(this).attr('top');
			var targetLeft = $(this).attr('left');
			var targetWidth = $(this).attr('width');
			var targetHeight = $(this).attr('height');
			var targetResource = $(this).attr('resourceid');
			if ($(this).get(0).tagName == "hypervideo"){
				$("#hypervideo").append('<div class="hotspot" id="'+targetID+'"></div>');
				$("#progressContainer").append('<div class="hotspotMarker" data-resource="'+targetResource+'" id="marker'+targetID+'"></div>');
				$("#marker"+targetID).css({
					left: markerLeft+"%"
				});
			} else {
				$("#hypervideo").append('<div class="innerTarget" id="'+targetID+'"></div>');
				$("#progressContainer").append('<div class="overlayMarker" id="marker'+targetID+'"></div>');
				$("#marker"+targetID).css({
					left: markerLeft+"%",
					width: markerWidth+"%"
				});
			}
			$("#marker"+targetID).click(function () {
				if (alreadyCalled) {
					clearTimeout(timeoutID);
					continuePlay(currentHotspot);
				}
				if (window.location.hash == '#t='+Math.ceil(targetIn)+'') {
					accessTime();
					pop.play();
				} else {
					window.location.hash = 't='+Math.ceil(targetIn)+'';
					pop.play();
				}
			}).hover(
				function () {
					if (!alreadyCalled) {
						var res = $(this).attr('data-resource');
						$("."+res).css("opacity", 1);
					}
				}, 
				function () {
					if (!alreadyCalled) {
						var res = $(this).attr('data-resource');
						$(".outerResult."+res).css("opacity", .3);
					}
				}
			);

			$("#"+targetID).css({
				top: targetTop + "%",
				left: targetLeft + "%",
				width: targetWidth + "%",
				height: targetHeight + "%",
			});
		});
		}
	});
	pop.parseXML(timelineSrc, function() {
    	//when finished
  	});
}

/*******************************************************************************************
* Add video source
*******************************************************************************************/
function loadVideo(fragmentURI, scriptURI) {
	hvHeight = "auto";
	var videoObj = $('<video></video>');
	videoObj.attr('id', "video");
	videoObj.attr('src', fragmentURI);
	videoObj.attr('data-timeline-sources', scriptURI);
	videoObj.attr('type', "video/webm");
	videoObj.attr('width', 100 +"%");
	videoObj.attr('height', hvHeight);
	videoObj.attr('tabindex', 0);
	videoObj.attr('autobuffer', "autobuffer");
	videoObj.attr('preload', "auto");
	videoObj.appendTo($("#hypervideo"));
	
	hvHeight = $("#video").height();
	
	$("#hypervideo").append('<canvas id="tmpVid" width="'+hvWidth+'" height="'+hvHeight+'"></canvas>');
	$("#tmpVid").css({
		"display": "none"
	});
	
	initCanvas();
}

/*******************************************************************************************
* Initiate Video, Canvas and Listeners (called after the video has been loaded)
*******************************************************************************************/
function initCanvas() {
	video = document.getElementsByTagName("video")[0];
	tmpVid = document.getElementById("tmpVid");
	sctxt = tmpVid.getContext("2d");
	
    video.addEventListener("loadedmetadata", function(){
    	pop = Popcorn("#video");
  		pop.hypervideo();
    	generateTargets();
    	accessTime();
		
		$(document).keydown(function(e) {
			switch(e.keyCode) { 
				case 27:
					if (mode == "fullscreen" && !nodeVisible) {
						setViewMode("timeline");
				    }
			    break;
				case 32:
					if (!nodeVisible) {
				        if (video.paused && !alreadyCalled) {
				        	pop.play();
				        } else if (alreadyCalled) {
				        	clearTimeout(timeoutDoc);
				        	continuePlay(currentHotspot);
				        } else if (documentCalled) {
				        	clearTimeout(timeoutDoc);
				        	pop.pause();
				        	return false;
				        } else {
				        	pop.pause();
				        }
				    }
				    e.preventDefault();
			    break;
			}
		});
		
		sceneCalled = false;
		resizeVideo();
		
		$("#fwPlayBtn").click(function () {
			if(alreadyCalled){
				continuePlay(currentHotspot);
			} 
			else {
				pop.play();
			}
			return false;
		});
		
		$("#pauseBtn").click(function () {
			if (alreadyCalled){
				clearTimeout(timeoutID);
			} else {
				pop.pause();
			}
			return false;
		});
		
		if (results > 0) {
			$("#circularScreenBtn").click(function () {
				if (mode == "circular") {
					return false;
				} else {
					setViewMode("circular");
				}
			});
			$("#showNodesAfter").click(function () {
				previewNodeDestinations();
			}).addClass("active");
		} else {
			$("#circularScreenBtn").css("visibility", "hidden");
		}
		
		$("#timelineScreenBtn").click(function () {
			if (mode == "timeline") {
				return false;
			} else {
				setViewMode("timeline");
			}
		});
		
		$("#fullscreenBtn").click(function () {
			if (mode == "fullscreen") {
				return false;
			} else {
				setViewMode("fullscreen");
			}
		});
		
		$("#closeDocumentBtn").click(function() {
			$("#documentDetail").hide();
			$(".clickable").removeClass('active');
		});
		
		$("#history #recordBtn").click(function() {
			if (recordHistory) {
				recordHistory = false;
				$(this).removeClass('active');
				localStorage.setItem("recordHistory", "false");
			} else {
				recordHistory = true;
				$(this).addClass('active');
				localStorage.setItem("recordHistory", "true");
			}
		});
		
		$("#history #deleteBtn").click(function() {
			deleteHistory();
		});
		
		$("#timelineBackBtn").click(function() {
			var currentPos = $("#timeline").position().left;
			if (currentPos >= $("#timelineView").width()/2) {
				return false;
			}
			$("#timeline").css("left", currentPos + 200 + "px");
		});
		
		$("#timelineFwdBtn").click(function() {
			var currentPos = $("#timeline").position().left;
			if (currentPos <= -$("#timeline").width()+$("#timelineView").width()/2) {
				return false;
			}
			$("#timeline").css("left", currentPos - 200 + "px");
		});
		
		if (top == self) {
			setTimeout('pop.play()', 500);
		}

    });
    
    video.addEventListener('timeupdate', function() {
		moveProgress();
		if (video.currentTime >= video.duration-0.5 && !sceneCalled) {
			sceneCalled = true;
			if (sceneCnt < scenes-1 && scenes > 1) {
				$("#mainContainer").hide();
				sceneCnt++;
				loadNew(sceneURIs[sceneCnt], sceneScripts[sceneCnt]);
				$("#mainContainer").show();
				video.play();
			} else if (narrativeNode && !nodeVisible) {
				//$("#mainContainer").css("background", "#efefef");
				nodeVisible = true;
				previewNodeDestinations();
			}
		}
	});
	
	video.addEventListener('play', function() {
		$("#fwPlayBtn").css("opacity",1);
		$("#pauseBtn").css("opacity",.5);
	});
	
	video.addEventListener('pause', function() {
		$("#fwPlayBtn").css("opacity",.5);
		$("#pauseBtn").css("opacity",1);
	});
		
	window.addEventListener("hashchange", accessTime, false);
}

/*******************************************************************************************
* Set View Mode
*******************************************************************************************/
function setViewMode(modeInput) {
	mode = modeInput;
	resultContainerWidth = $(window).width();
	resultContainerHeight = $(window).height();
	hGridUnit = resultContainerWidth/hItems;
	vGridUnit = resultContainerHeight/vItems;
	
	$("#resultContainer").css({
		width: resultContainerWidth + "px",
		height: resultContainerHeight + "px"
	});
	$("#resultContainer .box").css({
		width: hGridUnit-0.2 + "px",
		height: vGridUnit-0.2 + "px"
	});
	
	if (mode == "circular") {
		if (lastMode == "timeline") {
			$("#timelineView").hide();
			$(".outerResult").each(function(){
				var dataOriginH = $(this).attr("data-origin-h");
				var dataOriginV = $(this).attr("data-origin-v");
				$(this).appendTo("."+dataOriginV+" ."+dataOriginH);
			});
		}
		if (alreadyCalled) {
			$(".innerTarget").hide();
			$("#connectionContainer").hide();
		}
		$("#resultContainer #hypervideo").css({
			top: vGridUnit*2+15 + "px",
			left: hGridUnit*2+15 + "px",
			width: hGridUnit*6-32 + "px",
			height: vGridUnit*6-33 + "px"
		});
		$("#controls").css({
			top: vGridUnit*8+14 + "px",
			left: hGridUnit+15 + "px",
			width: hGridUnit*8-30 + "px",
			height: 60 + "px"
		});
		$("#documentDetail").css({
			top: vGridUnit*2+15 + "px",
			left: hGridUnit*2+15 + "px",
			width: hGridUnit*6-30 + "px",
			height: vGridUnit*6-30 + "px"
		}).children("#document").css({
			height: vGridUnit*6-68 + "px"
		});
		if (lastMode == "fullscreen" || lastMode == "timeline") {
			$("#history").show();
			resizeVideo();
		}
		$("#circularScreenBtn").css("opacity",1);
		$("#timelineScreenBtn").css("opacity",.5);
		$("#fullscreenBtn").css("opacity",.5);
		lastMode = "circular";
		
	} else if (mode == "timeline") {
		$("#timelineView").css({
			top: vGridUnit-34 + "px",
			left: hGridUnit+15 + "px",
			width: hGridUnit*8-30 + "px"
		}).show();
		$("#resultContainer #hypervideo").css({
			top: vGridUnit+15 + "px",
			left: hGridUnit+15 + "px",
			width: hGridUnit*8-31 + "px",
			height: vGridUnit*7 + "px"
		});
		$("#controls").css({
			top: vGridUnit*8+14 + "px",
			left: hGridUnit+15 + "px",
			width: hGridUnit*8-30 + "px",
			height: 60 + "px"
		});
		$("#documentDetail").css({
			top: vGridUnit+15 + "px",
			left: hGridUnit+15 + "px",
			width: hGridUnit*8-30 + "px",
			height: vGridUnit*7 + "px"
		}).children("#document").css({
			height: vGridUnit*7-36 + "px"
		});
		if (lastMode != "timeline") {
			for (var i=0; i<results; i++) {
				var obj = $(".outerResult[data-order="+i+"]");
				var blubb = obj.parents("div").attr("class").split(" ");
				var tmpOriginH = blubb[1];
				var tmpOriginV = obj.parents("div").parents("div").attr("class");
				obj.attr("data-origin-h", tmpOriginH);
				obj.attr("data-origin-v", tmpOriginV);
				obj.appendTo("#timeline");
			}
			
			$("#timeline").css({
				width: results*100 + "px"
			});
			
			if (alreadyCalled) {
				$(".innerTarget").hide();
				$("#connectionContainer").hide();
				positionTimeline();
			}
			$("#history").show();
			resizeVideo();
		}
		
		$("#circularScreenBtn").css("opacity",.5);
		$("#timelineScreenBtn").css("opacity",1);
		$("#fullscreenBtn").css("opacity",.5);
		lastMode = "timeline";
		
	} else if (mode == "fullscreen") {
		if (lastMode == "timeline") {
			$("#timelineView").hide();
			$(".outerResult").each(function(){
				var dataOriginH = $(this).attr("data-origin-h");
				var dataOriginV = $(this).attr("data-origin-v");
				$(this).appendTo("."+dataOriginV+" ."+dataOriginH);
			});
		}
		$("#hypervideo").css({
			top: 0 + "px",
			left: 0 + "px",
			width: $(window).width() + "px",
			height: $(window).height() - 60 + "px"
		});
		$("#controls").css({
			top: $(window).height() - 61 + "px",
			left: 0 + "px",
			width: $(window).width() + "px",
			height: 61 + "px"
		});
		$("#documentDetail").css({
			top: vGridUnit+15 + "px",
			left: hGridUnit+15 + "px",
			width: hGridUnit*8-30 + "px",
			height: vGridUnit*7 + "px"
		}).children("#document").css({
			height: vGridUnit*7-36 + "px"
		});
		if (lastMode == "circular" || lastMode == "timeline") {
			$("#history").hide();
			resizeVideo();
		}
		$("#circularScreenBtn").css("opacity",.5);
		$("#timelineScreenBtn").css("opacity",.5);
		$("#fullscreenBtn").css("opacity",1);
		lastMode = "fullscreen";
		if (alreadyCalled) {
			//drawConnections(currentHotspot);
		}
	}
	
	$("#controls #progressContainer").css({
		width: $("#controls").width() + "px",
		height: 30 + "px"
	});
	$("#controls #segmentContainer").css({
		width: $("#controls").width()-220 + "px"
	});
	$("#segmentContainer .segment").css({
		width: $("#segmentContainer").width()/scenes + "px"
	});
	if (top == self && results > 0) {
		localStorage.setItem("lastMode", lastMode);
	}
	moveProgress();
}

/*******************************************************************************************
* Window Resize Function
*******************************************************************************************/	
$(window).resize(function(){
	if ($(window).height() < 600) {
		setViewMode("fullscreen");
	} else {
		setViewMode(mode);
	}
	if (nodeVisible) {
		$("#preview0").css({
			top: vGridUnit + "px",
			left: resultContainerWidth/3*2 + "px",
			width: resultContainerWidth + "px",
			height: resultContainerHeight + "px"
		});
		$("#preview1").css({
			top: vGridUnit*6 + "px",
			left: resultContainerWidth/3*2 + "px",
			width: resultContainerWidth + "px",
			height: resultContainerHeight + "px"
		});
		drawNodeConnections();
	}
	moveProgress();
	resizeVideo();
});

/*******************************************************************************************
* Open Document (called by a click on document or on parseURI)
*******************************************************************************************/
function openDocument(documentSrc) {
	tnURL = documentSrc;
	docURL = tnURL.replace("tn_", "");
	history.replaceState("", "withDocument", "?document="+docURL+"&sequence="+narrativeSequence+"&scene="+fragmentURI+"#t="+Math.round(video.currentTime)+"");
	$('#document').children('img').attr('src', docURL);
	$("#documentURL").attr("value", window.location.href);
	$("#documentURL").click(function() {
		$(this).focus();
		$(this).select();
	});
	$("#document").children('img').load(function() {
		$('#documentDetail').show();
	});
}

/*******************************************************************************************
* Hack to transform the video-height out of AspectRatio 
*******************************************************************************************/
function resizeVideo() {
	var actualRatio = video.offsetHeight;
	targetRatio = $("#hypervideo").outerHeight();
	var adjustmentRatio = targetRatio/actualRatio;
	$(video).css("-moz-transform","scaleY("+adjustmentRatio+")");
}

/*******************************************************************************************
* Main Hotspot Function: 
* Takes the Hotspot-Area from the current frame and puts it on a canvas inside the hotspot
* (--> we got a piece of video on top of the video itself, so the appearance of the video 
* can be changed without changing the one of the current hotspot)
*******************************************************************************************/
function paintLink(thisHotspot) {
	$("#video").css("opacity","0.2");
	var tmpID;
	hvHeight = targetRatio;
	hvWidth = $("#video").outerWidth();
	$("#tmpVid").attr("height", hvHeight).attr("width", hvWidth);
	
	sctxt.drawImage(video, 0, 0, hvWidth, hvHeight);
	$("#"+thisHotspot.target).each(function(){
		tmpID = thisHotspot.target;
		
		document.getElementById(tmpID).getElementsByTagName("canvas")[0].width = document.getElementById(tmpID).offsetWidth;
		document.getElementById(tmpID).getElementsByTagName("canvas")[0].height = document.getElementById(tmpID).offsetHeight;
		
		var linkCanvas = document.getElementById(tmpID).getElementsByTagName("canvas")[0].getContext("2d");
		
		tmpTop = $(this).position().top;
		tmpLeft = $(this).position().left;
		tmpWidth = $(this).width();
		tmpHeight = $(this).height();
		
		var myImageData = sctxt.getImageData(tmpLeft, tmpTop, tmpWidth, tmpHeight);
		
		// this would change the colors of the current hotspot
		/*
		var pix = myImageData.data;
		for (var i = 0, n = pix.length; i <n; i += 4) {
		  var grayscale = pix[i] * .3 + pix[i+1] * .59 + pix[i+2] * .11;
		  pix[i] = grayscale;       // red
		  pix[i+1] = pix[i] * .3 + pix[i+1] * .6 + pix[i+2] * .3;  // green
		  pix[i+2] = pix[i] * .3 + pix[i+1] * .1 + pix[i+2] * .8;  // blue
		}
		*/
	
		linkCanvas.putImageData(myImageData, 0, 0);
	});
	
	video.pause();
	
	if(!alreadyCalled){
		if (mode == "fullscreen") {
			//drawConnections(thisHotspot);
		} else if (mode == "timeline") {
			positionTimeline();
		}
		if (!documentCalled) {
			timeoutID = setTimeout(function () {
				continuePlay(thisHotspot);
			}, 3000);
		} else {
			timeoutID = setTimeout(function () {
				openDocument(docURL);
			}, 3000);
		}
		alreadyCalled = true;
	}
}

/*******************************************************************************************
* Continue Playing after the Video has been paused by a Hotspot-Event
*******************************************************************************************/
function continuePlay(options){
		history.replaceState("", "withScene", "?sequence="+narrativeSequence+"&scene="+fullFragment+"");
		documentCalled = false;
		clearTimeout(timeoutID);
		$("#connectionContainer").css("display","none");
		$("#documentDetail").hide();
		video.play();
		$("#connectionContainer").children().remove();
		$("#"+options.target).hide();
        $(".innerTarget."+options.id).hide();
       	$(".outerResult."+options.id).css({
       		"opacity": "0.3"
       	}).removeClass('active clickable');
        $("#marker"+options.target).css({
        	"opacity": ".5"
        });
        $("#video").css("opacity","1");
		alreadyCalled = false;
}

/*******************************************************************************************
* Access currentTime directly by Hash (#t=?)
*******************************************************************************************/
function accessTime(){
	if(location.hash && !alreadyCalled){
		var tmpHash = location.hash.split("=");
		video.currentTime = tmpHash[1]-0.5;
		//video.play();
	} else {
		//return true;
	}
}

/*******************************************************************************************
* Write history entry in localStorage & Update history
*******************************************************************************************/
function updateHistory() {
	if (recordHistory) {
		var index;
		if (localStorage.getItem("lastIndex")) {
			index = localStorage.getItem("lastIndex");
		} else {
			index = 0;
		}
		var newIndex = parseInt(index)+1;
		localStorage.setItem("lastIndex", newIndex);
		localStorage.setItem('sequence'+newIndex, narrativeSequence);
		redrawHistory();
	} else {
		return false;
	}
}

function redrawHistory() {
	$("#history").children('a').remove();
	var h = 1;
	for (var i = 0; i < localStorage.length; i++) {
		var tmpKey = localStorage.key(i);
		if (tmpKey.indexOf("sequence") != -1) {
			var key = "sequence"+h;
			var item = localStorage.getItem(key);
			var sequenceTitle;
			$.ajax({
				type: "GET",
				url: "structure.xml",
				dataType: "xml",
				async: false,
				success: function(structure) {
					sequenceTitle = $(structure).find('narrativeSequence[id='+item+']').attr('title');
				}
			});
			
			
			var itemUri = "?sequence="+item;
			$("#history").append('<a href="'+itemUri+'">'+sequenceTitle+'</a>');
			h++;
		}
	}
	if ($("#history").children('a').length) {
		$("#history #deleteBtn").addClass('active');
	} else {
		$("#history #deleteBtn").removeClass('active');
	}
}

function deleteHistory() {
	for (var i = 0; i < localStorage.length; i++) {
		var tmpKey = localStorage.key(i);
		if (tmpKey != null && tmpKey.indexOf("sequence") != -1) {
			localStorage.removeItem(tmpKey);
		}
	}
	redrawHistory();
	localStorage.setItem("lastIndex", 0);
}

/*******************************************************************************************
* Update Progress in Player & Position Timeline (called in Timeline Mode)
*******************************************************************************************/
function moveProgress() {
	var progressLeft = 100 * (video.currentTime / video.duration);
	$("#progress").css({
		width: ($("#progressContainer").width()-3) / 100 * progressLeft  + "px"
	});
	$('.segment[data-scene-uri="'+fullFragment+'"]').children(".segmentProgress").css({
		width: ($('.segment').width()-3) / 100 * progressLeft  + "px"
	});
	updateTimeDisplay();
};

function updateTimeDisplay(){
  $("#controls #currentTime").html(formatTime(video.currentTime));
}

function positionTimeline() {
	var amount = $("#timeline .outerResult."+currentHotspot.id).length;
	var factor = parseInt($("#timeline .outerResult."+currentHotspot.id).first().attr('data-order'))*100;
	$("#timeline").css({
		//left: ($("#timelineView").width()/2)-(($("#timelineView").width()*2)/100*progressLeft) + "px"
		left: -factor-100*(amount/2) + $("#timelineView").width()/2 + "px"
	});
}

/*******************************************************************************************
* Draw Connections for a hotspot (currentHotspot is the current Popcorn object)
*******************************************************************************************/
function drawConnections(currentHotspot) {
	$("#connectionContainer").children().remove();
	$("#connectionContainer").css("display","block");
	var offset = $("#"+currentHotspot.target).show().offset();
	var spotX = offset.left;
	var spotY = offset.top;
	var spotW = $("#"+currentHotspot.target).width();
	var spotH = $("#"+currentHotspot.target).height();
	
	r = Raphael("connectionContainer", resultContainerWidth-10, resultContainerHeight-15),
	connections = [],
	shapes = [r.rect(spotX, spotY, spotW, spotH)];
    if (mode == "fullscreen"){
	    $(".innerTarget."+currentHotspot.id).each(function(){
	    	var rectOffset = $(this).show().offset();
	    	var rectX = rectOffset.left;
	    	var rectY = rectOffset.top;
	    	var rectW = $(this).width();
	    	var rectH = $(this).height();
	    	shapes.push(r.rect(rectX, rectY, rectW, rectH));
	    });
    } else {
    	$(".outerResult."+currentHotspot.id).each(function(){
	    	var rectOffset = $(this).show().offset();
	    	var rectX = rectOffset.left;
	    	var rectY = rectOffset.top;
	    	var rectW = $(this).width();
	    	var rectH = $(this).height();
	    	shapes.push(r.rect(rectX, rectY, rectW, rectH));
	    });
    }
    for (var i = 0, ii = shapes.length; i < ii; i++) {
        var color = "#666";
        shapes[i].attr({fill: color, stroke: color, "fill-opacity": 0, "stroke-width": 1});
    }
    for (var d = 1, dd = shapes.length; d < dd; d++) {
    	connections.push(r.connection(shapes[0], shapes[d], "#fff"));
    }
    $("rect").hide();
};

/*******************************************************************************************
* Draw Node-Connections
*******************************************************************************************/
function drawNodeConnections() {
	$("#nodeConnections").children().remove();
	$("#nodeConnections").css("display","block");
	var nodeX = 30;
	var nodeY = resultContainerHeight/4;
	var nodeW = resultContainerWidth/2;
	var nodeH = resultContainerHeight/2;
	
	var r = Raphael("nodeConnections", resultContainerWidth, resultContainerHeight);
	var connections = [];
	var shapes = [r.rect(nodeX, nodeY, nodeW, nodeH)];
    
	$(".destinationPreview").each(function(){
    	var rectUrl = $(this).attr('src');
    	var rectOffset = $(this).show().offset();
    	var rectX = rectOffset.left;
    	var rectY = rectOffset.top;
    	var rectW = $(this).width()*0.3;
    	var rectH = $(this).height()*0.3;
    	var rect = r.rect(rectX, rectY, rectW, rectH);
    	rect.attr({href: rectUrl});
    	shapes.push(rect);
    });
    for (var i = 0, ii = shapes.length; i < ii; i++) {
        var color = "#666";
        shapes[i].attr({
        	fill: color,
        	stroke: color,
        	"fill-opacity": 0,
        	"stroke-width": 1
        });
        if (i == 0) {
        	shapes[i].node.onclick = function() {
	        	$("#nodeConnections").hide();
	        	$(".destinationPreview").remove();
	        	$("#mainContainer").css({
					"-moz-transform": "scale(1,1)",
					"-moz-transform-origin": "center left",
					"margin-left": 0+"px"
				});
				nodeVisible = false;
				if ($("#trailNode").length) {
					$("#trailNode").remove();
				}
	        };
        }
    }
    for (var d = 1, dd = shapes.length; d < dd; d++) {
    	connections.push(r.connection(shapes[0], shapes[d], "#fff"));
    }
};

/*******************************************************************************************
* Draw Line ( called by drawConnections() & drawNodeConnections() )
*******************************************************************************************/
Raphael.fn.connection = function (obj1, obj2, line, bg) {
if (obj1.line && obj1.from && obj1.to) {
    line = obj1;
    obj1 = line.from;
    obj2 = line.to;
}
var bb1 = obj1.getBBox(),
    bb2 = obj2.getBBox(),
    p = [{x: bb1.x + bb1.width / 2, y: bb1.y - 1},
    {x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height + 1},
    {x: bb1.x - 1, y: bb1.y + bb1.height / 2},
    {x: bb1.x + bb1.width + 1, y: bb1.y + bb1.height / 2},
    {x: bb2.x + bb2.width / 2, y: bb2.y - 1},
    {x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height + 1},
    {x: bb2.x - 1, y: bb2.y + bb2.height / 2},
    {x: bb2.x + bb2.width + 1, y: bb2.y + bb2.height / 2}],
    d = {}, dis = [];
for (var i = 0; i < 4; i++) {
    for (var j = 4; j < 8; j++) {
        var dx = Math.abs(p[i].x - p[j].x),
            dy = Math.abs(p[i].y - p[j].y);
        if ((i == j - 4) || (((i != 3 && j != 6) || p[i].x < p[j].x) && ((i != 2 && j != 7) || p[i].x > p[j].x) && ((i != 0 && j != 5) || p[i].y > p[j].y) && ((i != 1 && j != 4) || p[i].y < p[j].y))) {
            dis.push(dx + dy);
            d[dis[dis.length - 1]] = [i, j];
        }
    }
}
if (dis.length == 0) {
    var res = [0, 4];
} else {
    res = d[Math.min.apply(Math, dis)];
}
var x1 = p[res[0]].x,
    y1 = p[res[0]].y,
    x4 = p[res[1]].x,
    y4 = p[res[1]].y;
dx = Math.max(Math.abs(x1 - x4) / 2, 10);
dy = Math.max(Math.abs(y1 - y4) / 2, 10);
var x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
    y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
    x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
    y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3);
var path = ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");
if (line && line.line) {
    line.bg && line.bg.attr({path: path});
    line.line.attr({path: path});
} else {
    //var color = typeof line == "string" ? line : "#000";
    return {
        bg: bg && bg.split && this.path(path).attr({fill: "none"}),
        line: this.path(path).attr({fill: "none"}),
        from: obj1,
        to: obj2
    };
}
};

var el;


/*******************************************************************************************
* Preview Node Destinations in iframe Elements **HARDCODED FOR TWO NODES**
*******************************************************************************************/

function previewNodeDestinations() {
	video.pause();
	$("#mainContainer").css({
		"-moz-transform": "scale(0.5,0.5)",
		"-moz-transform-origin": "center left",
		"margin-left": 30+"px"
	});
	nodeVisible = true;
	if (recordHistory) {
		$("#history").append('<img id="trailNode" src="./_img/nextNodes.gif"/>');
	}	
	setTimeout('showNodes()', 600);
}

function showNodes() {
	var nodeAmount = nodeArray.length;
	//if (!nodesLoaded) {
		for (var i=0; i < nodeAmount; i++) {
			$("body").append('<iframe id="preview'+i+'" class="destinationPreview" src="index.html?sequence='+nodeArray[i]+'"></iframe>');
		}
	//	nodesLoaded = true;
	//}
	$(".destinationPreview").show();
	$("#preview0").css({
		top: vGridUnit + "px",
		left: resultContainerWidth/3*2 + "px",
		width: resultContainerWidth + "px",
		height: resultContainerHeight + "px",
		"-moz-transform": "scale(0.3,0.3)",
		"-moz-transform-origin": "top left"
	});
	$("#preview1").css({
		top: vGridUnit*6 + "px",
		left: resultContainerWidth/3*2 + "px",
		width: resultContainerWidth + "px",
		height: resultContainerHeight + "px",
		"-moz-transform": "scale(0.3,0.3)",
		"-moz-transform-origin": "top left"
	});
	drawNodeConnections();
}

/*******************************************************************************************
* Little Helpers
*******************************************************************************************/

function parseURI() {
	if (location.search) {
		narrativeSequence = parseInt(getQueryVariable("sequence"));
		if (getQueryVariable("document")) {
			documentCalled = true;
			docURL = getQueryVariable("document");
		}
	} else {
		narrativeSequence = 1;
		//fragmentURI = getQueryVariable("scene");
	}
	if (location.hash) {
		forceHash = location.hash;
	}
}

function getQueryVariable(variable) {
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
		if (pair[0] == variable) {
			return pair[1];
		}
	}
}

function formatTime(seconds) {
	seconds = Math.round(seconds);
	minutes = Math.floor(seconds / 60);
	minutes = (minutes >= 10) ? minutes : "0" + minutes;
	seconds = Math.floor(seconds % 60);
	seconds = (seconds >= 10) ? seconds : "0" + seconds;
	return minutes + ":" + seconds;
}

var toSeconds = function(time) {
var t = time.split(":");
	if (t.length === 1) {
		return parseFloat(t[0], 10);
	} else if (t.length === 2) {
		return parseFloat(t[0], 10) + parseFloat(t[1] / 12, 10);
	} else if (t.length === 3) {
		return parseInt(t[0] * 60, 10) + parseFloat(t[1], 10) + parseFloat(t[2] / 12, 10);
	} else if (t.length === 4) {
		return parseInt(t[0] * 3600, 10) + parseInt(t[1] * 60, 10) + parseFloat(t[2], 10) + parseFloat(t[3] / 12, 10);
	}
};