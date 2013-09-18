define([
   './landing_page_base',
   'backbone',
   'rivets',
   'text!./landing_page_keys.html!strip',
], function(LandingPage, Backbone, rivets, template) {
    return LandingPage.extend({
        initialize: function(args) {
            var self = this;
            this.template = template;
            //console.log("LANDING_PAGE: initialize " + args.id);
            this.scope = new Backbone.Model({
              id: args.id,
              collection: args.collection,
            });
            this._do_init();
            //console.log("LANDING_PAGE: initialize end");
        },
    });
});

