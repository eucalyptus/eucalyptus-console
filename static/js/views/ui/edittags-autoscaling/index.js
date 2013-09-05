define([
   'underscore',
   'text!./template.html!strip',
   'backbone',
   'models/astag',
   'app',
   '../edittags/index'
], function(_, template, Backbone, Tag, app, EditTag) {
    
    return EditTag.extend({
      TagModel: Tag,
      template: template,
    });
});
