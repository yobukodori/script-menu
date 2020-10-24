# Script Menu - firefox extension
## Select and run the registered JavaScript from the menu. Using browser.tabs.executeScript API.
## 登録したJavaScritをメニューから選択して実行するFirefox拡張機能。tabs.executeScript APIを使用します。
![screenshot](https://yobukodori.github.io/freedom/image/script-menu-screenshot-02.jpg)
### Script Menu is available on [AMO](https://addons.mozilla.org/firefox/addon/script-menu/).
### Usage
![screenshot](https://yobukodori.github.io/freedom/image/script-menu-screenshot-01.jpg)
- **Print debug info**:  Output debug information at the bottom of the Options tab.  
- **Script Resource**: Script to register in the menu..    
  1. Each script begins with the //name directive.  
The //name directive specifies the script name to be displayed on the menu.  
        ```
        //name Go page top
        ```
  1. The //matches directive specifies a comma-separated list of URL patterns for the pages where you want to display the script name. (Optional)  
        ```
        //matches https://*.github.io/*, https://github.com/*
        ```
  1. The //excludes directive specifies a comma-separated list of URL patterns for the pages where you don't want to display the script name. (Optional)  
  The //excludes directive has a higher priority than the //matches directive.  
        ```
        //excludes https//yobukodori.github.io/*, https//github.com/yobukodori/*
        ```
  1. Next, use the //options directive to set [details](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/tabs/executeScript). (Optional)  
        ```
        //options  
        {  
          "allFrames": true  
		  "wrapCodeInScriptTag": true  
        }
        ```
        **wrapCodeInScriptTag** is a Script Menu specific option. If its value is true, the code is wrapped in a script tag and executed. Then you can access the variables defined by page script.  
Internally convert it to the following code and execute it.  
        ```
        (function() {  
          let script = document.createElement("script");  
          script.appendChild(document.createTextNode("("+function(){  
            // your code  
          }+")();"));  
          document.documentElement.appendChild(script);  
          script.remove();  
        })();  
        ```
  1. Finally, write the code with the //js directive.  
  **[NOTE] Doesn't check the syntax of the code, so please paste the code that has been tested to work.**  
        ```
        //js  
        (function(){
          alert("hello");
        })();
        ```
- **Save**: Save settings and scripts resource. And apply settings and scripts.
- **Apply**: Apply settings and scripts. (doesn't save).
- **Get Status**: get current status and applied scripts.
