define([
	'models/astags',
], 
function(ASTags) {
  var tags = new ASTags();

	tags.fetch({merge: true, add: true, remove: true});
	return tags;
});
