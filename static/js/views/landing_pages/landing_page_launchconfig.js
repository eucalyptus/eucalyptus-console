define([
   './landing_page_base',
   'backbone',
   'rivets',
   'text!./landing_page_launchconfig.html!strip',
], function(LandingPage, Backbone, rivets, template) {
    return LandingPage.extend({
        initialize: function(args) {
            var self = this;
            this.template = template;
            //console.log("LANDING_PAGE: initialize " + args.id);
            // this listener examines the collection to insert group_name(s) as needed
            // this value is used in the table security group column
            require(['app'], function(app) {
              var lc_fetched = false;
              var sg_fetched = false;
              populateGroupName = function() {
                if (app.data.sgroups != undefined && app.data.sgroups.length > 0) {
                  args.collection.each(function(model){
                    if(!model.get('group_name')) {
                      var sec_group = model.get('security_groups');
                      if (sec_group) sec_group = sec_group[0];
                      if (sec_group) model.set('group_name', app.data.sgroups.findWhere({id:sec_group}).get('name'));
                    }
                  });
                }
              };
              // these listeners ensure both data sets are loaded prior to calling above
              args.collection.on('add change reset', function() {
                lc_fetched = true;
                if (sg_fetched == true) {
                  populateGroupName();
                }
              });
              app.data.sgroups.on('add change reset', function() {
                sg_fetched = true;
                if (lc_fetched == true) {
                  populateGroupName();
                }
              });
              // call now, in case data is ready
              populateGroupName();
            });
            this.scope = new Backbone.Model({
              id: args.id,
              collection: args.collection,
     	      expanded_row_callback: function(e){
                var thisItem = e.item.get('name');
                var thisEscaped = self.hashCode(String(thisItem));
                var $placeholder = $('<div>').attr('id', "expanded-" + thisEscaped).addClass("expanded-row-inner-wrapper");
                if( e.item.get('expanded') === true ){
                  // IF EXPANDED, APPEND THE RENDER EXPANDED ROW VIEW TO THE PREVIOUS PLACEHOLDER, MATCHED BY ITEM'S ID
                  require(['app', 'views/expandos/launchconfig'], function(app, expando) {
                    var $el = $('<div>');
                    new expando({el: $el, model: app.data.launchconfig.where({name: thisItem})[0] });
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
            //console.log("LANDING_PAGE: initialize end");
        },
    });
});

