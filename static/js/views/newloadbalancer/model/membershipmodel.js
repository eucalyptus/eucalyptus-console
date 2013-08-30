define([
  'app',
  'backbone'
], function(app, Backbone) {
  return Backbone.Model.extend({

      finish: function(outputModel) {
        // TODO: set list of instances for this ELB
        //outputModel.set('security_groups', [this.toJSON()]);
      }
  });
});
