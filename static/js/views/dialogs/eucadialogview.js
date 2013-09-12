define([
   'backbone',
   'rivets',
], function(Backbone, rivets) {
    return Backbone.View.extend({
        _do_init : function( callback ) {
            $tmpl = $(this.template);
            iamBusy();
            var self = this;

            var tmp_scope = this.scope
            if (this.scope instanceof Backbone.Model) {
              tmp_scope = this.scope.attributes;
            }
            
            tmp_scope.$el = this.$el;
            tmp_scope.close = this.close;
            tmp_scope.help_flipped = false,
            tmp_scope.help_icon_class = 'help-link',

            this.$el.append($('.body', $tmpl).children());
            this.$help = $('<div class="dialog-help"><div class="dialog-help-content">help content</div><div class="help-revert-button"><a href="#">' + revert_button + '</a></div></div>');
            this.$el.appendTo('body');


            var title = $.i18n.prop($('.title', $tmpl).attr('data-msg'));
            this.$el.dialog({
                title: title,
                help: tmp_scope.help,
                autoOpen: false,  // assume the three params are fixed for all dialogs
                modal: true,
                width: tmp_scope.width ? tmp_scope.width : 600,
                maxHeight: tmp_scope.maxHeight ? tmp_scope.maxHeight : false,
                height: tmp_scope.height ? tmp_scope.height : 'auto',
                dialogClass: 'euca-dialog-container',
                show: 'fade',
                // don't add hide: 'fade' here b/c it causes an issue with positioning the dialog next to another dialog
                resizable: false,
                closeOnEscape : true,
                position: { my: 'center', at: 'center', of: window, collision: 'fit'},
                open: function(event, ui) {
                  // this is super hacky. Trying to set focus here seems to be not late enough
                  // so focus is actually on the first element by default, often a tab.
                  // by waiting a little, we get focus on the desired field.
                  setTimeout(function() {
                      var input_el = self.$el.parent().find('.focus-here');
                      input_el.focus();
                    }, 500);
                },
                close: function(event, ui) {
                  self.$el.empty();
                }
              });

              $(window).resize(function() {
                self.$el.dialog("option", "position", "center");
              });

            this.rivetsView = rivets.bind(this.$el, this.scope);
            this.render();

//            $('.help-link', this.$el).append('<a href="#">?</a>');

            $titleBar = tmp_scope.$el.parent().find('.ui-dialog-titlebar');
            if($titleBar.find('.' + tmp_scope.help_icon_class).length <= 0)
              $titleBar.append($('<div>')
                .addClass(tmp_scope.help_icon_class)
                .append($('<a>').attr('href','#').text('?')));
            this.setHelp(this.$el.parent(), title);

            this.$el.dialog('open');
  
            if(callback) {
              callback(this);
            }
        },
        close : function() {
            this.$el.dialog('close');
            this.$el.parent().empty();
        },
        render : function() {
            if (self.rivetsView != null) self.rivetsView.sync();
            return this;
        },
        setHelp : function($dialog, title) {
          var self = this;
          // patch in help as field if scope is not a Backbone Model.
          if (help == null && this.scope.get && this.scope.get('help') != null) {
            this.scope.help = this.scope.get('help');
          }
          var help = this.scope.help;
          var $help = help;
          var $titleBar = $dialog.find('.ui-dialog-titlebar');
          var $helpLink = $titleBar.find('.'+this.scope.help_icon_class+' a');
          if(!$help || !$help.content || $help.content.length <= 0){
            $helpLink.remove();
            console.log("removed help link");
            return;
          }
          var $buttonPane = $dialog.find('.ui-dialog-buttonpane');
          var $thedialog = $dialog.find('.euca-dialog');
          var helpContent = this.scope.help ? this.scope.help.content : '';
          this.$help.find('.dialog-help-content').html(helpContent);
          var $helpPane = this.$help;
          $helpLink.click(function(evt) {
            if(!self.scope.help_flipped){ 
              self.$el.data('dialog').option('closeOnEscape', false);
//              $buttonPane.hide();
              $thedialog.flippy({
                verso:$helpPane,
                direction:"LEFT",
                duration:"300",
                depth:"1.0",
                onFinish : function() {
                  self.scope.$el.find('.help-revert-button a').click( function(evt) {
                    $thedialog.flippyReverse();
                  });
                  self.scope.$el.find('.help-link a').click( function(evt) {
                    $thedialog.flippyReverse();
                  });       
                  if(!self.scope.help_flipped){
                    self.scope.help_flipped = true;
                    self.scope.$el.parent().find('.help-link').removeClass().addClass('help-return').before(
                      $('<div>').addClass('help-popout').append(
                        $('<a>').attr('href','#').text('popout').click(function(e){
                          if(help.url){
                            if(help.pop_height)
                              popOutPageHelp(help.url, help.pop_height);
                            else
                              popOutPageHelp(help.url);
                          }
                          self.scope.$el.parent().find('.help-revert-button a').trigger('click');
                        })
                      )
                    );
                  }else{
                    self.scope.help_flipped = false;
                    self.scope.$el.parent().find('.help-return').removeClass().addClass('help-link');
//                    self.scope.$el.parent().find('.help-popout').detach();
                    $buttonPane.show();
                  }
                  
                }
              });
            } else {
              self.scope.$el.parent().find('.help-revert-button a').trigger('click');
            }
          });
          self.$el.find('.help-revert-button a').click( function(evt) {
            $helpLink.trigger('click');
          });
        },
	});
});
