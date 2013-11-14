define([
 'app',
 './eucaexpandoview',
 'text!./snapshot.html!strip',
], function(app, EucaExpandoView, template) {
  return EucaExpandoView.extend({
    initialize : function(args) {
      var self = this;
      this.template = template;
      var tmp = this.model ? this.model : new Backbone.Model();
      this.model = new Backbone.Model();
      this.model.set('snapshot', tmp);
      this.scope = this.model;
      if(this.model.get('snapshot').get('tags').length > 0 ){
        this.scope.set('showTagHeader', true);
      }else{
        this.scope.set('showTagHeader', false);
      }
      this._do_init();
    
      var tmptags = this.model.get('snapshot').get('tags');
      tmptags.on('add remove reset sort sync', function() {
        if(self.model.get('snapshot').get('tags').length > 0 ){
          self.scope.set('showTagHeader', true);
        }else{
          self.scope.set('showTagHeader', false);
        }
        self.render();
      });
},
    remove : function() {
      this.model.destroy();
    }
  });
});
