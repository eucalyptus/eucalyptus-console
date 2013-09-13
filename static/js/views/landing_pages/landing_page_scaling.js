define([
   './landing_page_base',
   'backbone',
   'rivets',
   'text!./landing_page_scaling.html!strip',
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
                var thisItem = e.item.get('name');
                var thisEscaped = self.hashCode(String(thisItem));
                var $placeholder = $('<div>').attr('id', "expanded-" + thisEscaped).addClass("expanded-row-inner-wrapper");
                if( e.item.get('expanded') === true ){
                  // IF EXPANDED, APPEND THE RENDER EXPANDED ROW VIEW TO THE PREVIOUS PLACEHOLDER, MATCHED BY ITEM'S ID
                  require(['app', 'views/expandos/scaling'], function(app, expando) {
                    var $el = $('<div>');
                    new expando({el: $el, model: app.data.scalinggrps.where({name: thisItem})[0] });
                    $('#expanded-' + thisEscaped).children().remove();
                    $('#expanded-' + thisEscaped).append($el);
                  });
                }
                // IF NOT EXPANDED, RETURN THE PLACEHOLDER DIV
                return $('<div>').append($placeholder).html();
              },
              get_html_class_status: function(e){
                return "table-row-status status-" + e.item.get('state');
              },
            });
            this._do_init();
            console.log("LANDING_PAGE: initialize end");
        },
    });
});

