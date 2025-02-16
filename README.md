import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import static com.kms.katalon.core.testobject.ObjectRepository.findWindowsObject
import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import internal.GlobalVariable as GlobalVariable
import org.openqa.selenium.Keys as Keys
WebUI.openBrowser('')
WebUI.navigateToUrl('https://appstg.playleap.io/')
WebUI.click(findTestObject('Object Repository/Main Page/button_Next'))
WebUI.click(findTestObject('Object Repository/Main Page/button_Next_1'))
WebUI.click(findTestObject('Object Repository/Main Page/img_Jackob_fill-icon'))
WebUI.click(findTestObject('Object Repository/Main Page/p_USE PHONE'))
def randomnumber = System.currentTimeMillis()
WebUI.setText(findTestObject('Main Page/input_What is your Phone Number_phone-input'), '+9123' + randomnumber)
WebUI.click(findTestObject('Registration/Page_/button_NEXT'))
WebUI.waitForElementVisible(findTestObject('Registration/Page_/input_We have sent you a authentication code_otp-input-0'), 
    30)
WebUI.setText(findTestObject('Registration/Page_/input_We have sent you a authentication code_otp-input-0'), '1')
WebUI.setText(findTestObject('Registration/Page_/input_We have sent you a authentication code_otp-input-1'), '7')
WebUI.setText(findTestObject('Registration/Page_/input_We have sent you a authentication code_otp-input-2'), '0')
WebUI.setText(findTestObject('Registration/Page_/input_We have sent you a authentication code_otp-input-3'), '0')
WebUI.setText(findTestObject('Registration/Page_/input_We have sent you a authentication code_otp-input-4'), '0')
WebUI.setText(findTestObject('Registration/Page_/input_We have sent you a authentication code_otp-input-5'), '7')
WebUI.delay(5)
def Nicknamelist = ['Razi', 'Shuk', 'Malaud', 'Juman', 'Shumer', 'Jasons', 'Shok', 'Ohav', 'Drakon', 'Elas']
Random Nickrand = new Random()
int Nicknameposition = Nickrand.nextInt(11)
WebUI.setText(findTestObject('Registration/Page_/input_concat(Let, , s get to know you better)_nickname'), (Nicknamelist[
    Nicknameposition]) + randomnumber)
WebUI.click(findTestObject('Registration/Page_/button_DONE'))
WebUI.verifyElementPresent(findTestObject('Main Page/button_Next'), 3)

