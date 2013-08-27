define(['text!./tags.html', 'app'], function(template, app) {
  return Backbone.View.extend({

    initialize: function() {
      var self = this;
      this.template = template;
      var tags = new Backbone.Collection();
      if(this.model.get('scalingGroup').get('tags')) {
        tags = this.model.get('scalingGroup').get('tags');
      }

      var scope = new Backbone.Model({
        tags: tags
      });

      $(this.el).html(template);
      this.rView = rivets.bind(this.$el, scope);
    },

    render: function() {
      this.rView.sync();
      return this;
    }
  });
});
