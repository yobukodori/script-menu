# Script Menu - firefox extension
## Select and run the registered JavaScript from the menu. Using browser.tabs.executeScript API.
## I created this extension to make it easier to run JavaScript on firefox for mobile, which does not have a bookmarklet available.
## 登録したJavaScritをメニューから選択して実行するFirefox拡張機能。tabs.executeScript APIを使用します。
![screenshot](https://yobukodori.github.io/freedom/image/script-menu-screenshot-pc-menu.jpg)
### Script Menu is available on [AMO](https://addons.mozilla.org/firefox/addon/script-menu/).
### Usage
![screenshot](https://user-images.githubusercontent.com/32874862/229290932-3442accc-0401-478d-b818-2adc538c2bda.jpg)
- **Show menu in page**:  Show menu in page for quick access to the menu on Android.    
- **Print debug info**:  Output debug information at the bottom of the Options tab.  
- **Add line numbers**:  Add line numbers to script resource.  
- **Script Resource**: Script to register in the menu.    
  1. Script Resource must not begin with a non-directive line, such as a blank line. Always start with a specific directive line.  
  1. Each script begins with the //name directive.  
The //name directive specifies the script name to be displayed on the menu.  
        ```
        //name Go page top
        ```
  1. The //matches directive specifies a comma-separated list of URL patterns for the pages where you want to display the script name. (Optional)  
        ```
        //matches https://*.github.io/*, https://github.com/*
        ```
  1. The //exclude directive specifies a comma-separated list of URL patterns for the pages where you don't want to display the script name. (Optional)  
  The //exclude directive has a higher priority than the //matches directive.  
        ```
        //exclude https//yobukodori.github.io/*, https//github.com/yobukodori/*
        ```
  1. The //option directive specifies a comma-separated list of tokens. The following three tokens are available.  
    `//option page, all, blank`  
     **nonce**: Sets `true` to `wrapCodeInScriptTag` and `nonce`.  
     **page**: Sets true to `wrapCodeInScriptTag`.  
     **all**: Sets true to `allFrames`.  
     **blank**: Sets true to `matchAboutBlank`.  
    See the following //options directive for options.  
  1. The //options directive sets [details](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/tabs/executeScript). (Optional)  
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
          let e = document.createElement("script");
          e.append(<your code>);
          e.nonce = <nonce value>; // Set if nonce option is true.
          document.documentElement.appendChild(e); 
          e.remove();
        })();  
        ```
        **nonce** option is used with **wrapCodeInScriptTag** to set the nonce attribute on the script tag.  
		For example, `twitter.com` restricts script execution with Content Security Policy nonce-source. To run code in the context of a page script:  
        ```
        //name xhr logger
        //matches *://twitter.com/*
        //; The next option should be 'nonce'. Specifying 'page' will fail.
        //option nonce
        //js
        XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
            apply: function(target, thisArg, args ) {
                console.log(args[0], args[1]);
                return Reflect.apply(target, thisArg, args);
            }
        });
        ```
        You can also use comment style or comma expression style so that it will not cause an error when executed as javascript.
        ```
        //options  
        /* { "wrapCodeInScriptTag": true } */  
        ```
        or
        ```
        //options  
        0, { "wrapCodeInScriptTag": true }
        ```
  1. Finally, write the code with the //js directive.  
  **[NOTE] Doesn't check the syntax of the code, so please paste the code that has been tested to work.**  
        ```
        //js  
        (function(){
          alert("hello");
        })();
        ```
  1. Simply write the URL and you can execute the script.  
  The add-on itself reads the script from the URL and executes the loaded code.  
  **[NOTE] If you want to access the variables/functions/objects, etc. created by the page script, specify wrapCodeInScriptTag in the //options section.**  
        ```
        //js  
        https://yobukodori.github.io/foo.js  
        ```
  1. Prepared the following built-in scripts for Fenix.  
        ```
        //name View Page Source    
        //js  
        builtin:view-page-source  
        //name View (Selected) outerHTML
        //js  
        builtin:view-outerhtml
        ```
  1. //module directive and //require directive  
  **//module**: Define module.  
  **//require**: Import module or external script file. Can import multiple modules.    
        ```
		//module libA
		//js
		function foo(){ console.log("foo"); }
		function bar(){ console.log("bar"); }
		//module libB
		//js
		function baz(){ console.log("baz"); }
		//name item-1
		//require libA
		//js
		foo();
		//name item-2
		//require libA, libB
		//js
		bar(); baz();
		//name item-3
		//require https&#x3A;//code.jquery&#x2E;com/jquery-2.2.4.min.js
		//js
		console.log(typeof $);
        ```
  1. **//#include** preprocess-directive replaces this line with the contents of the file at the given url.
        ```
        //#include https://yobukodori.github.io/scrip-menu-item.js
        ```
        You can specify any part of the script resource as it is simply replaced before parsing.  
        
  1. Other directives. (Optional)  
  **//disable**: disable this script. In case you don't use the script but want to keep it.  
  **//eof**: Ignore the lines that follow.    
  **//[-=*;#]**: Comment line. Excluding **//#include**.   
        ```
        //name Obsolete script
        //disable
        //js
        (function(){/* code */})();
        //==========================
        //name Beautify the page
        //# comment
        //js
        (function(){/* code */})();
        //---------------------------
        //eof
        #############################
        [memo]
        ...
        [todo]
        ...
        ```
- **Go to line**: Move the cursor to the specified line.
- **Go to Script...**: Move the cursor to the start of each script.
- **Save**: Save settings and scripts resource. And apply settings and scripts.
- **Apply**: Apply settings and scripts. (doesn't save).
- **Get Status**: get current status and applied scripts.
