define([
   './landing_page_base',
   'backbone',
   'rivets',
   'text!./landing_page_volumes.html!strip',
], function(LandingPage, Backbone, rivets, template) {
    return LandingPage.extend({
        initialize: function(args) {
            var self = this;
            this.template = template;
            console.log("LANDING_PAGE: initialize " + args.id);
            this.scope = new Backbone.Model({
              id: args.id,
              collection: args.collection,
     	      expanded_row_callback: function(e){
                var thisID = e.item.get('id');
                var $placeholder = $('<div>').attr('id', "expanded-" + thisID).addClass("expanded-row-inner-wrapper");
                if( e.item.get('expanded') === true ){
                  // IF EXPANDED, APPEND THE RENDER EXPANDED ROW VIEW TO THE PREVIOUS PLACEHOLDER, MATCHED BY ITEM'S ID
                  require(['app', 'views/expandos/volume'], function(app, expando) {
                    var $el = $('<div>');
                    new expando({el: $el, model: app.data.volume.where({id: thisID})[0] });
                    $('#expanded-' + thisID).children().remove();
                    $('#expanded-' + thisID).append($el);
                    console.log("OPENED EXPANDED ROW: " + thisID);
                  });
                }
                // IF NOT EXPANDED, RETURN THE PLACEHOLDER DIV
                return $('<div>').append($placeholder).html();
              },
              get_html_class_status: function(e){
                var this_status = e.item.get('status');
                if( this_status === "attaching"){
                  this_status = "in-use";
                }
                return "table-row-status status-" + this_status;
              },
            });
            this._do_init();
            console.log("LANDING_PAGE: initialize end");
        },
    });
});

