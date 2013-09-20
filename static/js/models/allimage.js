// image model
//

define([
  'backbone'
], function(Backbone) {
  var model = Backbone.Model.extend({
    initialize: function() {
      if(!this.get('platform')) {
        this.set('platform', 'linux');
      }
    },
  });
  return model;
});
