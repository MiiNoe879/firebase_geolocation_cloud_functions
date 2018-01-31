# Firebase App For HelloMoon

    make sure to set .env file.  you can probably start with .env.default env or create your own
    npm install -g firebase-tools<br>
    firebase login<br>
    <br>
    cd functions<br>
    npm install<br>





# Environment Config
     ```bash
     firebase functions:config:set stripe.token=<YOUR STRIPE API KEY>
     firebase functions:config:set stripe.secret_key=<YOUR STRIPE SECRET KEY>
     ```    
  - For example to access environment values in code use `functions.config().stripe.token`  
    
    
    
## Deploy and test
To test this integration:
-     `firebase use --add`
    `firebase deploy --only functions`
