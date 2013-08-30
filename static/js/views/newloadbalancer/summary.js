define([
  'text!./summary.html',
  'rivets'
], function(template, rivets) {
  return Backbone.View.extend({
    tpl: template,
    initialize: function() {
      var scope = {
        view: this,
        loadbalancerModel: this.options.loadbalancerModel,
        membershipModel: this.options.membershipModel,
        healthcheckModel: this.options.healthcheckModel,
        title: 'Summary',
      };

      this.$el.html(this.tpl);
      this.riv = rivets.bind(this.$el, scope);
      this.render();
    },

    render: function() {
      this.riv.sync();
    }

  });
});
