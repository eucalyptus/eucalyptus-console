define([
    'underscore',
    'backbone',
    'app',
  'text!./image.html!strip',
  'text!./image-infiniteitem.html!strip',
  'rivets',
  'views/searches/image',
  './model/blockmap',
  'infinity'
	], function( _, Backbone, app, template, itemTemplate, rivets, imageSearch, BlockMap, infinity ) {
	return Backbone.View.extend({
            title: app.msg('launch_instance_section_header_image'),
            next: app.msg('launch_instance_btn_next_type'),
            count: 0,
            image_selected: null,

            initialize : function(args) {
              infinity.config.PAGE_TO_SCREEN_RATIO = 5;
              var self = this;
              var imgSource = app.data.allimages;
              if (app.aws.aws_account) {
                imgSource = app.data.amazonimages;
              }
              // create this collection so that we can set up event listeners on images to fill it.
              var search_collection = new Backbone.Collection(imgSource.where({type: 'machine', state: 'available'}));
              // populate the search_collection if we get new images data
              self.listenTo(imgSource, 'add remove sync change reset', function() {
                search_collection.set(imgSource.where({type: 'machine', state: 'available'}));
              });
              var scope = {
                view: this,
                blockmaps: self.options.blockMaps,

                formatName: function(image){
                  return DefaultEncoder().encodeForHTML(this.image.get('name'));
                },
 
                formatDescription: function(image){
                  return DefaultEncoder().encodeForHTML(this.image.get('description'));
                },

                isOdd: function() {
                    var selected = this.isSelected(arguments);
                    return ((this.view.count++ % 2) ? 'even' : 'odd') + selected;
                },

                isSelected: function(image) {
                  var image = this.image;
                  if (self.model.get('id') == image.get('id')) {
                      return ' selected-row';
                  } 
                  return '';
                },

                setClass: function(image) {
                    var image = this.image;
                    return inferImage(image.get('location'), image.get('description'), image.get('platform'));
                },

                search: new imageSearch(search_collection),
                
                select: function(e, images) {
                  $(e.currentTarget).parent().find('tr').removeClass('selected-row');
                  $(e.currentTarget).addClass('selected-row');
                  self.model.set('image_iconclass', this.setClass(images.image));
                  self.model.set('id', images.image.get('id'));
                  //images.image.unset('tags'); // workaround - nested objects break the next line
                  self.model.set(images.image.toJSON());
                  self.model.set('platform', this.setClass(self.model));

                  //block device maps
                  var maps = images.image.get('block_device_mapping');
                  var keys = _.keys(maps);
                  for(i=0; i<keys.length; i++) {
                    var key = keys[i];
                    var map = {
                      device_name: key,
                      volume_size: maps[key].size
                    };
                    
                    var subkeys = _.keys(maps[key]);
                    for(j=0; j<subkeys.length; j++) {
                      map[subkeys[j]] = maps[key][subkeys[j]];
                    }
                  }
                  if(map !== undefined) {
                    self.options.blockMaps.reset(new BlockMap(map));
                  } else {
                    self.options.blockMaps.reset();
                  }
                },

                
                launchConfigErrors: {
                  image_id: ''    
                }
          };
          self.model.on('validated:invalid', function(model, errors) {
              scope.launchConfigErrors.image_id = errors.id; 
              self.render(); 
          });

          self.model.on('validated:valid', function()  {
            scope.launchConfigErrors.image_id = null;
            self.render();
          });


          scope.images = scope.search.filtered;
          this.scope = scope;

         $(this.el).html(template)
         this.rView = rivets.bind(this.$el, this.scope);

          var $itmpl = $('#launch-images', self.el).clone();

          $('#launch-images', self.el).remove();
          var updateInfinity = _.debounce(function() {
              console.log('begin infinity init');

              if (self.infinity != undefined) { 
                  console.log('removed old el', self.el);
                  $('#launch-images', self.el).remove();
                  self.infinity.remove(); 
                  self.infinit = undefined;
              }
              
              var $newtmpl = $itmpl.clone(); 
              $('#table-wrapper', self.el).prepend($newtmpl);

              self.infinity = new infinity.ListView($newtmpl, {useElementScroll: true});
              var count = 0;

              var isSelected = function(image) {
                  if (self.model.get('id') == image.get('id')) {
                      return ' selected-row';
                  } 
                  return '';
              }

              var setClass = function(image) {
                    return inferImage(image.get('location'), image.get('description'), image.get('platform'));
              }

              var added = 0;
              var totalAdded = 0;
              var doWork = function() {
                  // console.log('start work');
                  var start = new Date().getTime();

                  while (count < scope.search.filtered.length && (new Date().getTime() - start < 500)) {
                      var image = scope.search.filtered.at(count);
                      var $tmpl = $(itemTemplate);
                      rivets.bind($tmpl, new Backbone.Model({
                            image:image,
                            formatName: DefaultEncoder().encodeForHTML(image.get('name')),
             
                            formatDescription: DefaultEncoder().encodeForHTML(image.get('description')),

                            isOdd: (count % 2) ? 'even' : 'odd',

                            isSelected: isSelected,

                            setClass: setClass
                      }));
                      self.infinity.append($tmpl);
                      count++;
                      added++;
                  }

                  // console.log('count: ' + count);

                  if (count < scope.search.filtered.length && added < 100) { 
                      _.defer(doWork);
                  } else {
                      // console.log('end infinity init:', added);
                      totalAdded += added;
                      added = 0;
                  }
              }
              doWork();

              var $scrollbox = $($newtmpl.children().get(0));
              $newtmpl.on('scroll', _.debounce(function() {
                  // console.log('SCROLL!', $scrollbox.height(), $newtmpl.scrollTop());
                  if (added < scope.search.filtered.length && 
                      $scrollbox.height() == $newtmpl.scrollTop() + $newtmpl.height()) {
                      doWork();
                  }
              }));

          }, 2000);

              self.render();
          scope.search.filtered.on('add remove sync change reset', function() {
              updateInfinity();
          });

          updateInfinity();

         this.render();

         if(this.model.get('image') != undefined) {
            this.$el.find('span:contains("' + this.model.get('image') + '")').closest('tr').click();
         }

        },

        render: function() {
          this.rView.sync();
        },
    
        isValid: function() {
          this.model.validate(_.pick(this.model.toJSON(),'id'));
          var error = this.model.isValid();

          return error;
        },
  });
});
