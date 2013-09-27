define([
  'app',
  'text!./type.html!strip',
  'rivets',
	], function( app, template, rivets ) {
  return Backbone.View.extend({
    tpl: template,
    title: app.msg("launch_instance_section_header_type"),
    next: app.msg('launch_instance_btn_next_security'),

    initialize : function() {

      var self = this;
      this.model.set('tags', new Backbone.Collection());

      // listen to events from the tag editor buttons
      this.listenTo(this.model.get('tags'), 'tagCreateClick', function(m) {
        if(m.get('name') == 'Name') {
          self.model.set('instance_names', m.get('value'));
        }
      }); 
      this.listenTo(this.model.get('tags'), 'tagConfirmClick', function(m) {
        if(m.get('name') == 'Name') {
          self.model.set('instance_names', m.get('value'));
        }
      });
      this.listenTo(this.model.get('tags'), 'tagDeleteClick', function(m) {
        if(m.get('name') == 'Name') {
          self.model.unset('instance_names');
        }
      });
      this.listenTo(this.model.get('tags'), 'tagRestoreClick', function(m) {
        if(m.get('name') == "Name") {
          self.model.set('instance_names', m.get('value'));
        }
      });

      
      this.model.set('zones', app.data.availabilityzone);

      // for the instance types/sizes pulldown, sorted asc
      var typesTemp = new Backbone.Collection();
      typesTemp.comparator = function(type) {
          return (+type.get('cpu')) + (+type.get('ram'));
      };
      var typeObjects = $.eucaData.g_session['instance_type'];
      _.each(typeObjects, function(val, key) {
        typesTemp.add({name: key, cpu: val[0], ram: val[1], disk: val[2]});
      });
      this.model.set('types', typesTemp.sort());

      this.model.set('type_number', 1); // preload 1
      this.model.set('min_count', 1);
      this.model.set('max_count', 1);

      this.model.set('zone', 'Any'); // preload no zone preference


      var scope = new Backbone.Model({
        model: self.model,
        tags:  self.model,

        isZoneSelected: function(obj) { 
          if (self.model.get('zone') == obj.zone.get('name')) {
            return true;
          } 
          return false;
        },


        setField: function(e, el) {
          var target = e.target;
          switch(target.id) {
            case 'launch-instance-names':
              //if(self.model.get('instance_names')) {
              //  var names = self.model.get('instance_names').split(',');
              //  for(i in names) {
              //    var trimmed = names[i]i.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
              //  }
              //  self.model.trigger('addTag', new Backbone.Model({name: 'Name', value: self.model.get('instance_names')}), true);
              //}
              break;
            default:
          }
        },

        iconClass: function() {
          return self.model.get('image_iconclass'); 
        },


        formatType: function(obj) {
          var buf = obj.type.get('name') + ": ";
          buf += obj.type.get('cpu') + " " + app.msg('launch_wizard_type_description_cpus') + ", ";
          buf += obj.type.get('ram') + " " + app.msg('launch_wizard_type_description_memory') + ", ";
          buf += obj.type.get('disk') + " " + app.msg('launch_wizard_type_description_disk') + ", ";
          return buf;
        },

        isSelected: function(objects) {
          if(objects.type.get('name') == self.model.get('instance_type')) {
            return true;
          }
        },

        setMinMax: function(e) {
          var regex1 = /^[1-9]+$/;
          var regex2 = /^[1-9]+-[0-9]+$/;
          var val = e.target.value;
          self.model.unset('min_count');
          self.model.unset('max_count');
          if(regex1.test(val)) {
            self.model.set('min_count', val);
            self.model.set('max_count', val);
            return val;
          }
          if(regex2.test(val)) {
            self.model.set('min_count', val.substring(0, val.indexOf('-')));
            self.model.set('max_count', val.substring(val.indexOf('-')+1));
            return val;
          }
        },
    
        launchConfigErrors: new Backbone.Model({
          defaults: {
            type_number: null,
            instance_type: null,
            instance_names: null,
            tag_limit_reached: null,
            min_count: null,
            max_count: null
          }
        })
    });

    this.scope = scope;

    scope.get('launchConfigErrors').on('change:min_count change:max_count', function(m, val) {
      this.set('type_number', val);
    });

    self.model.on('validated', function(isValid, model, errors) {
      scope.get('launchConfigErrors').clear();
      scope.get('launchConfigErrors').set(errors);
    });
 
    self.model.on('change:instance_type', function() {
      $.cookie('instance_type', self.model.get('instance_type'));
    });

    self.model.get('tags').on('add', function() {
      self.model.set('type_hasTags', true);
    });

    self.listenTo(self.model, 'change:instance_names', function(m,val) {
      self.model.trigger('addTag', new Backbone.Model({name: 'Name', value: val}), true);
    });

    $(this.el).html(this.tpl);
     this.rView = rivets.bind(this.$el, scope);
     this.render();

     if($.cookie('instance_type')) {
       this.model.set('instance_type', $.cookie('instance_type'));
     } else {
       this.model.set('instance_type', 'm1.small'); // preload first choice if no cookie value
     }
    },

    render: function() {
      this.rView.sync();
    },

    isValid: function() {
      
      var json = this.model.toJSON();
      this.model.validate(_.pick(this.model.toJSON(),'min_count', 'max_count'));
      if (!this.model.isValid())
        return false;

      this.model.validate(_.pick(this.model.toJSON(),'instance_type'));
      if (!this.model.isValid())
        return false;

      return true;
    },

    // called from wizard.js when each step is displayed.
    // there is also a matching blur() hook. 
    focus: function() {
      this.model.set('type_show', true);
    },

    blur: function() {
      this.model.trigger('confirm', true);
    },

  });
});
