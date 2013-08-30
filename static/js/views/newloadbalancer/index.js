define([
  'app',
  'wizard',
  'text!./template.html',
  './page1',
  './page2',
  './page3',
  './summary',
  './model/loadbalancerModel',
  './model/membershipmodel',
  './model/healthcheckmodel'
], function(app, Wizard, wizardTemplate, page1, page2, page3, summary, loadbalancer, membership, healthcheck) {
  var config = function(options) {
    var wizard = new Wizard();

    var loadbalancerModel = new loadbalancer();
    var membershipModel = new membership();
    var healthcheckModel = new healthcheck();

    function canFinish(position, problems) {
      // VALIDATE THE MODEL HERE AND IF THERE ARE PROBLEMS,
      // ADD THEM INTO THE PASSED ARRAY

      return loadbalancerModel.isValid() & (position == 2);
    }

    function finish() {
      membershipModel.finish(loadbalancerModel);
      healthcheckModel.finish(loadbalancerModel);

      loadbalancerModel.on('validated:invalid', function(e, errors) {
        console.log('INVALID MODEL', arguments);
      });

      loadbalancerModel.validate();
      if(loadbalancerModel.isValid()) {
        loadbalancerModel.save({}, {
            overrideUpdate: true,
            success: function(model, response, options){  
              if(model != null){
                var name = model.get('name');
                name = DefaultEncoder().encodeForHTML(name);  // XSS PREVENTION - KYO 080813
                notifySuccess(null, $.i18n.prop('create_load_balancer_run_success', name));  
              }else{
                notifyError($.i18n.prop('create_load_balancer_run_error'), undefined_error);
              }
            },
            error: function(model, jqXHR, options){  
              notifyError($.i18n.prop('create_load_balancer_run_error'), getErrorMessage(jqXHR));
            }
        });

        // navigate back to load balancers landing page
        var $container = $('html body').find(DOM_BINDING['main']);
        $container.maincontainer("changeSelected", null, {selected:'loadbalancers'});
      } else {
        // what do we do if it isn't valid?
        alert('Final checklist was invalid.');
      }
    }

    var viewBuilder = wizard.viewBuilder(wizardTemplate)
            .add(new page1({model: loadbalancerModel}))
            .add(new page2({model: membershipModel}))
            .add(new page3({model: healthcheckModel}))
            .setHideDisabledButtons(true)
            .setFinishText(app.msg('create_load_balancer_btn_create')).setFinishChecker(canFinish)
            .map('optionLink', '#optionLink')
            .finisher(finish);
            //.summary(new summary( {loadbalancerModel: loadbalancerModel, membershipModel: membershipModel, healthcheckModel: healthcheckModel} ));
    var ViewType = viewBuilder.build();
    return ViewType;
  }
  return config;
});

