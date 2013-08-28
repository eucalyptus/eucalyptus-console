define(['text!./tags.html', 'app'], function(template, app) {
  return Backbone.View.extend({
      title: app.msg('tab_tags'),
      next: app.msg('create_scaling_group_btn_next_membership'),

    initialize: function() {
      var self = this;
      this.template = template;

      var scope = new Backbone.Model({
        model: self.model.get('scalingGroup')
      });

      this.scope = scope;
      $(this.el).html(template);
      this.rView = rivets.bind(this.$el, scope);
    },

    render: function() {
      this.rView.sync();
      return this;
    },

    blur: function() {
      this.scope.get('model').trigger('confirm', true);
    },
});
});
