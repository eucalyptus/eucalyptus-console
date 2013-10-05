define([
   './landing_page_base',
   'backbone',
   'rivets',
   'text!./landing_page_images.html!strip',
], function(LandingPage, Backbone, rivets, template) {
    return LandingPage.extend({
        initialize: function(args) {
            var self = this;
            this.template = template;
            //console.log("LANDING_PAGE: initialize " + args.id);
            var scope = this.scope = new Backbone.Model({
              id: args.id,
              recordCount: function() { return $.i18n.prop('image_found', scope.get('collection').length); },

              // filter out kernel and ramdisk images
              collection: new Backbone.Collection(args.collection.where({type:'machine', state:'available'})),
              
     	      expanded_row_callback: function(e){
                var thisID = e.item.get('id');
                var $placeholder = $('<div>').attr('id', "expanded-" + thisID).addClass("expanded-row-inner-wrapper");
                if( e.item.get('expanded') === true ){
                  // IF EXPANDED, APPEND THE RENDER EXPANDED ROW VIEW TO THE PREVIOUS PLACEHOLDER, MATCHED BY ITEM'S ID
                  require(['app', 'views/expandos/image'], function(app, expando) {
                    var $el = $('<div>');
                    new expando({el: $el, model: app.data.allimages.where({id: thisID})[0] });
                    $('#expanded-' + thisID).children().remove();
                    $('#expanded-' + thisID).append($el);
                  });
                }
                // IF NOT EXPANDED, RETURN THE PLACEHOLDER DIV
                return $('<div>').append($placeholder).html();
              },
              launch_instance: function(context, event){
                //console.log("Clicked to launch: " + event.item.id);
                // TAKEN FROM THE OLD CODE BASE, support.js - KYO 081413
                var image_id = event.item.id;
                var $container = $('html body').find(DOM_BINDING['main']);
                $container.maincontainer("changeSelected", null, { selected:'launcher', filter: {image: image_id}});
              },
            });

            // update the filtered collection when the search is updated
            this.listenTo(args.collection, 'add change sync reset remove sort', function() {
              self.scope.get('collection').reset(args.collection.where({type:'machine'}));
            });

            this._do_init();
            //console.log("LANDING_PAGE: initialize end");
        },
    });
});

