// PLUGIN: HYPERVIDEO

(function ( Popcorn ) {
  Popcorn.plugin( "hypervideo", {
      manifest: {
        about: {
          name: "Popcorn Hypervideo Plugin",
          version: "0.1",
          author: "Joscha Jaeger",
          website: "http://open-hypervideo.org/"
        },
        options: {
          start: {
            elem: "input",
            type: "number",
            label: "In"
          },
          end: {
            elem: "input",
            type: "number",
            label: "Out"
          },
          id: {
            elem: "input",
            type: "text",
            label: "resource_ID"
          },
          /*
          text: {
            elem: "input",
            type: "text",
            label: "TEXT"
          },
          */
          target: "image-container"
        }
      },
      _setup: function( options ) {
        var timelineSrc = $("#video").attr("data-timeline-sources");
        $.ajax({
			type: "GET",
			url: timelineSrc,
			dataType: "xml",
			async: false,
			success: function(timeline) {
			
			$(timeline).find('documents').children('resource[id='+options.id+']').children().each(function(){
				var targetID = $(this).attr('target');
				var targetTop = $(this).attr('top');
				var targetLeft = $(this).attr('left');
				var targetWidth = $(this).attr('width');
				var targetHeight = $(this).attr('height');
				var targetSrc = $(this).attr('src');
				$("#hypervideo").append('<img class="innerTarget doc '+options.id+'" id="'+targetID+'" src="'+targetSrc+'"/>');
				$(".innerTarget#"+targetID).css({
					top: targetTop + "%",
					left: targetLeft + "%",
					width: targetWidth + "%",
					height: targetHeight + "%"
				}).click(function () {
					clearTimeout(timeoutID);
					docURL = $(this).attr('src');
        			openDocument(docURL);
				});
			});
			$(".innerTarget."+options.id).hide();
			}
		});
		$("#"+options.target).append('<canvas></canvas>');
		$("#"+options.target).hide();
			
      },

      /**
       * The start function will be executed when the currentTime
       * of the video  reaches the start time provided by the
       * options variable
       */
      start: function( event, options ) {
        $("#"+options.target).show();
        currentHotspot = options;
        paintLink(options);
        if (mode == "fullscreen"){
        	$(".innerTarget."+options.id).show();
        } else {
        	$(".innerTarget."+options.id).hide();
        }
        $(".outerResult."+options.id).css({
        	"opacity": "1",
        	"border": "1px solid #81999A"
        }).addClass('clickable');
        $("#marker"+options.target).css({
        	"opacity": "1"
        });
      },
      /**
       * The end function will be executed when the currentTime
       * of the video  reaches the end time provided by the
       * options variable
       */
      end: function( event, options ) {
        //the end
      },
      _teardown: function( options ) {
      	//clean up
      }
  });
})( Popcorn );
