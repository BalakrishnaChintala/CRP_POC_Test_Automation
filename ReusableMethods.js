var ReusableMethodsPage = function() {  
        
  this.dropdownTitle = function(Title) {
      var dropdown=element(by.cssContainingText('label', Title));
      dropdown.click();
  }

  this.dropdownOption = function(Option) {
     var option=element(by.cssContainingText('option', Option));
     option.click();
}

  };
  module.exports = new ReusableMethodsPage();

  


  