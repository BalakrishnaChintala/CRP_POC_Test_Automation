var reusableMethods = require('./ReusableMethods');

describe('CRP Create TOC', function()
{
    //locators in Create TOC Page 
    var applicationDescription = element(by.name('applicationDescription'));
    var createAssemblynewApplication = element(by.className('newapp'));
    var applicationNumber = element(by.name('applicationNumber'));
    var sequenceNumber = element(by.name('Sequencenum'));
    var submissionDate = element(by.name('submissiondate'));
    var submissionDescription = element(by.name('submissiondesc'));
    var eCTDCheckbox = element(by.name('ectdcb'));
    var productInformation = element(by.xpath('//li[contains(text(), " Product information ")]'));
    var submissionInformation = element(by.xpath('//li[contains(text(), " *Submission information ")]'));
    var drugProducts = element(by.xpath('//li[contains(text(), " Drug products ")]'));
    var drugSubstances = element(by.xpath('//li[contains(text(), " Drug substances ")]'));
    var compounds = element(by.xpath('//li[contains(text(), " Compounds ")]'));
    var createTOCbutton = element(by.buttonText('Create'));
    //var selectDTD = element(by.name('dtdCheckBox'));
    var nextButton = element(by.buttonText('Next'));
    var submitButton = element(by.buttonText('Submit'));
    var applications =  element(by.xpath('//a[contains(text(), "APPLICATIONS")]'));
    var selectDTDnode = element(by.xpath('//div[contains(text(), "0000")]'));
    var autoAassign = element(by.xpath('//span[contains(text(), "Auto assign")]'));
    
//will be executed before every it block
    beforeEach(function()
    {

    browser.get('http://10.96.153.168:4200');
    browser.driver.manage().window().maximize();
    });

    //test case 1
    it('create asemby as new application', function()
    {
        createAssemblynewApplication.click();
        browser.driver.sleep(1000);
        applicationDescription.sendKeys('Paracetomol 250mg Submission US');
        browser.driver.sleep(1000);
        applicationNumber.sendKeys('12345');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Application status');
        reusableMethods.dropdownOption('Submitted');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Product code');
        reusableMethods.dropdownOption('Cetrizine');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Project name');
        reusableMethods.dropdownOption('Cetrizine-263');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Geographic region');
        reusableMethods.dropdownOption('US-United States');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Submission country');
        reusableMethods.dropdownOption('United States of America');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Health authority');
        reusableMethods.dropdownOption('FDA - Food and Drug Administration');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Application type');
        reusableMethods.dropdownOption('IND - Investigational New Drug');
        browser.driver.sleep(1000);
        eCTDCheckbox.click();
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('DTD');
        reusableMethods.dropdownOption('ich-ectd-3-2.dtd');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Template');
        reusableMethods.dropdownOption('ich-ectd-3-2.dtd');
        browser.driver.sleep(1000);
        submissionInformation.click();
        browser.driver.sleep(2000);
        sequenceNumber.sendKeys('0000');
        browser.driver.sleep(1000);
        //submissionDate.sendkeys('2018-02-21');
        //browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Submission type');
        reusableMethods.dropdownOption('Original Application');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Submission status');
        reusableMethods.dropdownOption('Submitted');
        browser.driver.sleep(1000);
        submissionDescription.sendKeys('Description for the submission');
        browser.driver.sleep(1000);
        productInformation.click();
        browser.driver.sleep(1000);
        drugProducts.click();
        reusableMethods.dropdownTitle('Dosage form');
        reusableMethods.dropdownOption(' Aerosol');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Dosage strength');
        reusableMethods.dropdownOption('5mg');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Drug product manufacturer');
        reusableMethods.dropdownOption(' Glatt Pharmaceutical');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Indication');
        reusableMethods.dropdownOption('Angina');
        browser.driver.sleep(1000);
        drugSubstances.click();
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Drug substance name');
        reusableMethods.dropdownOption(' Paracetamol');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Drug substance manufacturer');
        reusableMethods.dropdownOption(' Sun pharma');
        browser.driver.sleep(1000);
        compounds.click();
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Compound ID');
        reusableMethods.dropdownOption('AR-262');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Product chemical names');
        reusableMethods.dropdownOption('Paracetemol');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('INN');
        browser.driver.sleep(1000);
        reusableMethods.dropdownOption('GSK Synthon Catalent');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Generic name');
        reusableMethods.dropdownOption('Paracetemol');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Trade name');
        reusableMethods.dropdownOption('Calpol');
        browser.driver.sleep(1000);
        reusableMethods.dropdownTitle('Trade Country');
        reusableMethods.dropdownOption('USA');
        browser.driver.sleep(1000);
        createTOCbutton.click();
        browser.driver.sleep(2000);
        nextButton.click();
        browser.driver.sleep(1000);
        browser.actions().mouseMove(selectDTDnode).perform();
        browser.driver.sleep(1000);
        //browser.actions().click(protractor.Button.RIGHT).perform();
        //browser.driver.sleep(1000);
        //autoAassign.click();
        //browser.driver.sleep(4000);
        submitButton.click();
        browser.driver.sleep(1000);
        applications.click();
        browser.driver.sleep(1000);
    });

});

;

   /**  //test case 2
    it('addition test case', function()
    {
        expect(browser.getTitle()).toEqual('Super Calculator');
        firstNumber.sendKeys('4');
        secondNumber.sendKeys('2');
        gobutton.click();
        expect(result.getText()).toEqual('6');
    });

    //test case 3
    it('addition test case 2', function()
    {
        firstNumber.sendKeys('5');
        secondNumber.sendKeys('3');
        gobutton.click();
        expect(result.getText()).toEqual('8');
    });

    //test case 4
    it('Read value from input field', function()
    {
        firstNumber.sendKeys('5');
        expect(firstNumber.getAttribute('value')).toEqual('5');
    });

    */

