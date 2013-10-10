define([
	'text!./template.html!strip',
    'rivets',
    'visualsearch'
	], function( template, rivets, VS ) {
	return Backbone.View.extend({
		initialize : function(args) {
            var self = this;
			this.$el.html(template);
      this.vsearch = VS.init({
          container : this.$el,
          showFacets : true,
          query     : this.model.defaultSearch,
          callbacks : {
              search       : this.model.search,
              facetMatches : this.model.facetMatches,
              valueMatches : this.model.valueMatches
          }
      });

      _.each(this.model.deriveFacets(), function(pair) {
        self.vsearch.categoryLabels[pair.value] = pair.label;
      });

      this.vsearch.searchBox.setQuery(this.model.defaultSearch);

			this.rview = rivets.bind(this.$el, args.model);

      this.listenTo(this.model.records, 'add remove change reset sync', function() {
        this.vsearch.searchBox.searchEvent($.Event('keydown'));
      });
		},
    
		render : function() {
			this.rview.sync();
			return this;
		}
	});
});
