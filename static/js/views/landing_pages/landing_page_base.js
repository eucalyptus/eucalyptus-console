define([
   'backbone',
   'rivets',
   'views/databox/databox',
], function(Backbone, rivets, DataBox) {
    return Backbone.View.extend({

        // BASE INITIALIZE FUNCTION FOR ALL LANDING PAGES
        _do_init : function() {
          var self = this;
          $tmpl = $(this.template);

          // OUT OF THE EXISTING TEMPLATE, FIND THE 'EUCA-MAIN-CONTAINER' DIV AND REPLACE IT WITH THIS RIVETS TEMPLATE
          this.$el.append($tmpl);
          $('#euca-main-container').children().remove();
          this.$el.appendTo($('#euca-main-container'));

          // ATTRIBUTES FOR PAGE/TABLE DISPLAY. TAKEN FROM DATATABLES
          this.scope.set('iDisplayStart', 0);
          this.scope.set('iDisplayLength', 10);
          this.scope.set('iSortCol', 0);
          this.scope.set('sSortDir', "asc");

          // SET UP FUNCTION CALLS AND LISTENER FOR THIS VIEW
          this.setup_scope_calls();
          this.setup_listeners();

          // CLEAN UP THE PREVIOUS MARKERS   
          this.scope.get('collection').each(function(model){
            model.set('clicked', false);
            model.set('expanded', false);
          });

          // INITIALIZE THE DATABOX INSTANCE
          this.scope.set('databox', new DataBox(this.scope.get('collection')));

          // CHECK_ALL BOOLEAN VALUE FOR THE CLICK-ALL BUTTON
          this.scope.set('is_check_all', false);

          // INITIALIZE THE COLLECTION 'items' AND SET UP LISTENERS
          this.adjust_page();

          // BIND AND RENDER
          this.bind();
          this.render(); 

        },
        // SETUP VARIOUS CALLBACK CALLS FOR THE LANDING PAGE
        setup_scope_calls: function() {
          var self = this;

          // EVEN AND ODD ROW CLASS FOR THE TABLE
          this.scope.set('get_table_row_class', function(e){
            if( e.item_index % 2 == 1 ){
              return "odd";
            }
            return "even";
          });

          // GET PAGINATE BUTTON CLASS FOR THE GO TO THE FIRST PAGE BUTTON
          this.scope.set('get_paginate_button_class_go_to_first', function(e){
            var this_class = "first paginate_button";
            if( self.scope.get('iDisplayStart') === 0 ){
              this_class = this_class + " paginate_button_disabled";
            }
            return this_class;
          });

          // GET PAGINATE BUTTON CLASS FOR THE GO TO THE PREVIOUS PAGE BUTTON
          this.scope.set('get_paginate_button_class_go_to_previous', function(e){
            var this_class = "previous paginate_button";
            if( self.scope.get('iDisplayStart') === 0 ){
              this_class = this_class + " paginate_button_disabled";
            }
            return this_class;
          });

          // GET PAGINATE BUTTON CLASS FOR THE GO TO THE NEXT PAGE BUTTON
          this.scope.set('get_paginate_button_class_go_to_next', function(e){
            var this_class = "next paginate_button";
            var thisDisplayStart = self.scope.get('iDisplayStart');
            var thisDisplayLength = self.scope.get('iDisplayLength');
            var totalCount = self.scope.get('collection').length;
            if( thisDisplayStart + thisDisplayLength >= totalCount ){
              this_class = this_class + " paginate_button_disabled";
            }
            return this_class;
          });

          // GET PAGINATE BUTTON CLASS FOR THE GO TO THE LAST PAGE BUTTON
          this.scope.set('get_paginate_button_class_go_to_last', function(e){
            var this_class = "last paginate_button";
            var thisDisplayStart = self.scope.get('iDisplayStart');
            var thisDisplayLength = self.scope.get('iDisplayLength');
            var totalCount = self.scope.get('collection').length;
            if( thisDisplayStart + thisDisplayLength >= totalCount ){
              this_class = this_class + " paginate_button_disabled";
            }
            return this_class;
          });

          // GET PAGINATE BUTTON CLASS FOR THE PAGE INDEX BUTTON
          this.scope.set('get_paginate_button_class_index', function(e){
            var this_class = "paginate_button";
            var thisDisplayStart = self.scope.get('iDisplayStart');
            var thisDisplayLength = self.scope.get('iDisplayLength');
            var currentIndex = parseInt(thisDisplayStart / thisDisplayLength);
            if ( currentIndex === e.page_index ){
              this_class = "paginate_active";
            };
            return this_class;
          });

          // CHECK-ALL BUTTON CALLBACK
          this.scope.set('clicked_check_all_callback', function(context, event) {
            console.log("is_check_all: " + self.scope.get('is_check_all'));
            if ( self.scope.get('is_check_all') === false ){
              self.scope.set('is_check_all', true); 
            }else{
              self.scope.set('is_check_all', false); 
            };

            self.scope.get('items').each(function(model){
              // MARK THE CURRENT MODELS FOR 'DATA-CHECKED' FIELD CHECK
              model.set('clicked', self.scope.get('is_check_all'));
            });
          });

          this.scope.set('expand_row', function(context, event){
            var thisModel = '';
            var this_id = event.item.id;
            // SPECIAL CASE FOR EIP LANDING PAGE WHERE THERE IS NO ID FOR THE MODEL
            if ( self.scope.get('id') === "eips" ){
              this_id = event.item.get('public_ip');
              thisModel = self.scope.get('items').where({public_ip: this_id})[0];
            }else if ( self.scope.get('id') === "scaling" || self.scope.get('id') === "launchconfig" ){
              this_id = event.item.get('name');
              thisModel = self.scope.get('items').where({name: this_id})[0];
            }else{
              thisModel = self.scope.get('items').get(this_id);
            }
            console.log("Clicked to expand: " + this_id);
            var is_expanded = true;
            // IF ALREADY EXPANDED, CLOSE IT
            if( thisModel.get('expanded') === true ){
              is_expanded = false;
            }
            thisModel.set('expanded', is_expanded);
          });

          // DISPLAY COUNT ADJUSTMENT BAR (TOP-RIGHT) CALLBACK
          this.scope.set('adjust_display_count', function(context, event){
            var selected_length = 10;   // DEFAULT VALUE
            if( context.srcElement === undefined ){
              selected_length = context.target.text;
            }else{
              selected_length = context.srcElement.innerText;
            }
            console.log("Clicked: " + selected_length);
            self.scope.set('iDisplayStart', 0);
            self.scope.set('iDisplayLength', selected_length); 
            self.adjust_page();
            self.render();
          });

          // PAGE ADJUSTMNET BAR (BOTTOM-RIGHT) CALLBACK
          this.scope.set('adjust_display_page', function(context, event){
            var clicked_item = "First";  // DEFAULT
            if( context.srcElement === undefined ){
              clicked_item = context.target.text;
            }else{
              clicked_item = context.srcElement.innerText;
            }
            console.log("Clicked: " + clicked_item);
            if( clicked_item === "First" ){
              self.scope.set('iDisplayStart', 0);
            }else if( clicked_item === "Last" ){
              while( self.scope.get('collection').length > self.scope.get('iDisplayStart') + self.scope.get('iDisplayLength')){
                self.scope.set('iDisplayStart', self.scope.get('iDisplayStart') + self.scope.get('iDisplayLength'));
              }
            }else if( clicked_item === "Previous" ){
              self.scope.set('iDisplayStart', self.scope.get('iDisplayStart') - self.scope.get('iDisplayLength'));
              if( self.scope.get('iDisplayStart') < 0 ){
                self.scope.set('iDisplayStart', 0);
              }
            }else if( clicked_item === "Next" ){
              if( self.scope.get('collection').length > self.scope.get('iDisplayStart') + self.scope.get('iDisplayLength')){
                self.scope.set('iDisplayStart', self.scope.get('iDisplayStart') + self.scope.get('iDisplayLength'));
              }
            }else{
              self.scope.set('iDisplayStart', (parseInt(clicked_item) - 1) * self.scope.get('iDisplayLength')); 
            }
            self.adjust_page();
            self.render();
          });

          // COLUMN SORT CALLBACK
          this.scope.set('sort_items', function(context, event){
            console.log(context);
            console.log(event);
            var source = self.scope.get('id').slice(0,-1);   // REMOVE LAST CHAR; ex. eips to eip - KYO 080713
            if( source === "key" ){   // SPECIAL CASE FOR KEYPAIR - KYO 082113
              source = "keypair";
            };
            var cellIndex = "1"; // DEFAULT
            var selected_length = 10;   // DEFAULT VALUE
            if( context.srcElement === undefined ){
              cellIndex = context.target.cellIndex;
            }else{
              cellIndex = context.srcElement.cellIndex;
            }
            self.scope.set('iSortCol', cellIndex);
            if( self.scope.get('sSortDir') === "asc" ){
              self.scope.set('sSortDir', "desc");
            }else{
              self.scope.set('sSortDir', "asc");
            }
            console.log("SORT - source: " + source + " iSortCol: " + self.scope.get('iSortCol') + " sSortDir: " + self.scope.get('sSortDir'));
            self.scope.get('databox').sortDataForDataTable(source, self.scope.get('iSortCol'), self.scope.get('sSortDir'));

            self.adjust_page();
          });
        },
        // SET UP VARIOUS LISTENERS FOR THE LANDINGE PAGE
        setup_listeners: function(){
          // REGISTER BUTTONS CALBACK - KYO 081613
          this.$el.find('div.euca-table-size').find('a.show').click(function () {
            if($(this).hasClass('selected'))
              return;
            $(this).parent().children('a').each( function() {
              $(this).removeClass('selected');
            });
            $(this).addClass('selected');
          });
        },
        // COMPUTE THE PAGE INDEX ARRAY FOR THE PAGE BAR ON THE BOTTOM-RIGHT CORNER
        setup_page_info: function(){
          var thisPageLength = this.scope.get('iDisplayLength');
          var totalCount = this.scope.get('collection').length;
          var thisIndex = 1;
          var thisCount = 0;

          this.scope.set('pages', new Backbone.Collection());          
          this.scope.get('pages').add( new Backbone.Model({index: thisIndex}) );
          thisIndex = thisIndex + 1;
          while( totalCount > thisCount + thisPageLength ){
            this.scope.get('pages').add( new Backbone.Model({index: thisIndex}) );
            thisIndex = thisIndex + 1;
            thisCount = thisCount + thisPageLength;
          }
          return;
        },
        close : function() {
          this.$el.empty();
        },
        bind: function() {
          this.rivetsView = rivets.bind(this.$el, this.scope);
        },
        render : function() {
          this.rivetsView.sync();
          return this;
        },
        get_element: function() {
          return this.$el;
        },
        refresh_view: function() {
          console.log("-- Landing Page View Refresh Begins --");
          // PROB: REFRESHMENT OF THE COLLECTION ENDS UP REMOVING THE CHECKED LIST - KYO 081613
          this.adjust_page();
          this.activate_more_actions_button();
          this.setup_page_info();
          this.render();
          console.log("-- Landing Page View Refresh Ends --");
        },
        adjust_page: function(){
          console.log("iDisplayStart: " + this.scope.get('iDisplayStart'));
          console.log("iDisplayLength: " + this.scope.get('iDisplayLength'));
          this.scope.set('items' , this.scope.get('databox').getCollectionBySlice(this.scope.get('iDisplayStart'), this.scope.get('iDisplayStart') + this.scope.get('iDisplayLength')));
          
          this.activate_more_actions_button();
          this.setup_page_info();
          this.setup_listener_on_items();
        },
        setup_listener_on_items: function(){
          var self = this;
          this.scope.get('items').on('sync reset change add remove', function() {
              console.log('LANDING PAGE BASE: items update');
              self.activate_more_actions_button();
          });
        },
        activate_more_actions_button: function(){
          // ACTIVE "MORE ACTIONS" BUTTON
          // TEMP. SOL: THIS SHOUOLD BE DONE VIA RIVETS TEMPLATE - KYO 080613
          console.log("CHECK TO ACTIVATE THE MORE ACTIONS BUTTON");
          if( this.count_checked_items() === 0 ){
            $menu = $('#more-actions-'+this.scope.get('id'));
            $menu.addClass("inactive-menu");
          }else{
            $menu = $('#more-actions-'+this.scope.get('id'));
            $menu.removeClass("inactive-menu");
          }
        },
        count_checked_items: function(){
          var count = 0;
          this.scope.get('items').each(function(model){
            if( model.get('clicked') === true ){
              count++;
            }
          });
          console.log("COUNT: " + count);
          return count;
        },
        get_checked_items_for_datatables: function(sourceName, columnIdx){
          // TRY TO MATCH THE BEHAVIOR OF GETSELECTROW CALL  -- KYO 0080613
          // THIS NEEDS TO BE SIMPLIFIED.
          var selectedRows = [];
          var source = sourceName;
          // GET THE SOURCE OF THE LANDING PAGE
          console.log("Landing Page Source: " + source);
          // GET THE DATATABLE COLUMN MAP BASED ON THE SOURCE
          var columnMaps = this.scope.get('databox').columnMap;
          var thisColumnMap = [];
          $.each(columnMaps, function(index, map){
            if( map.name == source ){
              thisColumnMap = map.column;
            }
          });
          console.log("Column Map: " + JSON.stringify(thisColumnMap));
          // SET THE DEFAULT COLUMN ITEM TO "ID"
          var thisValue = "id";
          // SCAN ALL THE MODELS ON THIS LANDING PAGE
          this.scope.get('items').each(function(model){
            // CHECK IF THE MODEL IS CLICKED
            if( model.get('clicked') === true ){
             console.log("Clicked Row's ID: " + model.get('id'));
             // IF THIS getSelectedRows() FUNCTION IS INVOKED WITH A SPECIFIC COLUMN INDEX, 
	     if(columnIdx){
	       console.log("columnIdx: " + columnIdx);
               // SCAN THE MAP AND FIND THE MATCHING VALUE PER INDEX
               $.each(thisColumnMap, function(index, col){
                 if( col.id == columnIdx ){
                   thisValue = col.value;
                 };
               });
               selectedRows.push(model.toJSON()[thisValue]);
               console.log("Selected Row's Column Value: " + thisValue + "=" + model.toJSON()[thisValue]);
             }else{
               // NO SPECIFIC COLUMN INDEX CASE: SEND THE WHOLE MODEL ARRAY
	       selectedRows.push(model.toJSON());
	     }
            }	
          });  
          return selectedRows;
        },
   });
});

