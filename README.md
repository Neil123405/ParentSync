**Step 1**: Download zip file of master

**Step 2**: Unzip zip file

**Step 3**: Open the folder in Visual Studio Code


**Step 4**: Open terminal of Visual Studio Code

**Step 5**: type command "npm install @ionic/cli"

**Step 6**: type command "cd ParentSync-master"

**Step 7**: type command "npm install @angular/cli"

**Step 8**: type command "npm install signature_pad"

**Step 9**: open command prompt and type the command "ipconfig" to get your ip address


**Step 10**: ParentSync-master\src\app\services\api.service.ts scroll down to line 47 then change 'http://YOUR IP ADDRESS:8000/api' to the ip address of your computer
'http://NEW IP ADDRESS:8000/api'. 

**Step 11**: ParentSync-master\src\environments\environment.ts, ilisi ang apiUrl to 'http://NEW IP ADDRESS:8000/api'

**Step 12**: ParentSync-master\src\environments\environment.prod.ts, ilisi ang apiUrl to 'http://NEW IP ADDRESS:8000/api'

**Step 13**: ilisi ang .env Laravel APP_URL=http://NEW IP ADDRESS:8000


**Step 14**: Disable your firewall in Windows Security settings, kung asa ang 'active' ana maoy ee disable


**Step 15**: sa Laravel type ang command "php artisan serve --host=IP ADDRESS --port=8000"

**Step 16**: sa Ionic type ang command "npx ionic serve"

**Step 17**: If walay picture bisang gi upload na
--TO LOAD THE .png OF THE STUDENTS AND PARENTS/USERS type ning command

*Remove-Item .\public\storage -Force -Recurse*

*php artisan storage:link*

*dir .\public\storage*


kung gusto mo mag cellphone kay ang kanang naa sa taas pwede rana ee run gamit command "npx ionic serve" pero sa browser ra;

install Android Studio, kalimot nako unsaon pag fully set up aning android studio pero naa ra na sa youtube nya dili 
kaayo daghan kuri kuri, nya imong android dapat naay "developer options", naa ra kay ee pislit sa settings kalima(5) 
para mu gawas ang "developer options" search lang internet unsaon pag reveal ana nga options ug unsaon pag connect
sa android cellphone sa android studio gamit cable.

kung mana ka anang android studio ug set up sa imong cellphone, sa imong Ionic nga app ee type ning command "npx ionic build", "npx cap sync android",
"npx cap open android".
pag bantay lang sa version sa imong android kay basing naay error kung bagoo nga version pero pwede ra na ma fix
