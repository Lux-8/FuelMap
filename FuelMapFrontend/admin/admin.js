console.log("admin.js загружен");

// ===============================
// ELEMENTSgit
// ===============================

const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");

const adminPassword = document.getElementById("adminPassword");
const adminLoginError = document.getElementById("adminLoginError");




// ===============================
// LOGIN
// ===============================


if(adminLoginBtn){

adminLoginBtn.addEventListener("click", async ()=>{


const password = adminPassword.value.trim();


try{


const response = await fetch(
`${API}/admin/login`,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
password
})

});


const data = await response.json();



if(response.ok){


localStorage.setItem(
"admin_token",
data.token
);


loginScreen.style.display="none";

adminPanel.style.display="flex";


loadStats();


}
else{


adminLoginError.textContent =
data.detail || "Неверный пароль";


}



}catch(error){


console.error(error);

adminLoginError.textContent =
"Сервер недоступен";


}



});


}




// ===============================
// LOGOUT
// ===============================


if(adminLogoutBtn){


adminLogoutBtn.onclick=()=>{


localStorage.removeItem(
"admin_token"
);


location.reload();


};


}




// ===============================
// AUTO LOGIN
// ===============================


if(localStorage.getItem("admin_token")){


if(loginScreen)
loginScreen.style.display="none";


if(adminPanel)
adminPanel.style.display="flex";


}




// ===============================
// TABS
// ===============================


function openTab(tab,event){



const tabs=[

"dashboard",
"users",
"stations",
"reports",
"achievements",
"visits"

];



tabs.forEach(t=>{


const el=document.getElementById(
t+"Tab"
);


if(el)
el.style.display="none";


});



const current=document.getElementById(
tab+"Tab"
);



if(current)
current.style.display="block";




document
.querySelectorAll(".admin-menu button")
.forEach(btn=>{

btn.classList.remove("active");

});



if(event)
event.target.classList.add("active");




if(tab==="users")
loadUsers();


if(tab==="stations")
loadStations();


if(tab==="reports")
loadReports();


if(tab==="visits")
loadVisits();



}





// ===============================
// STATS
// ===============================


async function loadStats(){


try{


const token =
localStorage.getItem(
"admin_token"
);



const response =
await fetch(
`${API}/admin/stats`,
{
headers:{
Authorization:
`Bearer ${token}`
}
}
);



const data =
await response.json();



const users =
document.getElementById(
"statUsers"
);


const stations =
document.getElementById(
"statStations"
);


const reports =
document.getElementById(
"statReports"
);



if(users)
users.textContent =
data.users_count ?? 0;



if(stations)
stations.textContent =
data.stations_count ?? 0;



if(reports)
reports.textContent =
data.reports_count ?? 0;



}catch(err){

console.error(
"Stats error",
err
);

}


}






// ===============================
// USERS
// ===============================


async function loadUsers(){


const box =
document.getElementById(
"usersTable"
);


if(!box)return;



const token =
localStorage.getItem(
"admin_token"
);



const response =
await fetch(
`${API}/admin/users`,
{
headers:{
Authorization:
`Bearer ${token}`
}
}
);



const users =
await response.json();



box.innerHTML="";



users.forEach(user=>{


box.innerHTML+=`

<div class="admin-row">


<span>
#${user.id}
</span>


<span>
${user.name || "Без имени"}
</span>


<span>
${user.email}
</span>


<span>
${user.created_at || "-"}
</span>



<button 
class="admin-btn"
onclick='openUserModal(${JSON.stringify(user)})'>

👁

</button>



</div>

`;


});


}






// ===============================
// STATIONS
// ===============================


async function loadStations(){


const box =
document.getElementById(
"stationsTable"
);


if(!box)return;


const token =
localStorage.getItem(
"admin_token"
);



const response =
await fetch(
`${API}/admin/stations`,
{
headers:{
Authorization:
`Bearer ${token}`
}
}
);



const stations =
await response.json();



box.innerHTML="";



stations.forEach(s=>{


box.innerHTML+=`

<div class="admin-row">


<span>
#${s.id}
</span>


<span>
${s.name}
</span>


<span>
${s.status}
</span>



<button class="admin-btn">

🗑

</button>



</div>

`;

});


}





// ===============================
// REPORTS
// ===============================


async function loadReports(){


const box =
document.getElementById(
"reportsTable"
);


if(!box)return;



box.innerHTML=`

<div class="admin-row">

<b>
Пользователь
</b>


<b>
Комментарий
</b>


<b>
Дата
</b>


<b>
Действие
</b>


</div>


`;



}





// ===============================
// VISITS
// ===============================


async function loadVisits(){


const box =
document.getElementById(
"visitsTable"
);


if(!box)return;



const token =
localStorage.getItem(
"admin_token"
);



try{


const response =
await fetch(
`${API}/admin/visits`,
{
headers:{
Authorization:
`Bearer ${token}`
}
}
);



const data =
await response.json();



box.innerHTML=`

<h3>
🌐 Всего посещений:
${data.total}
</h3>

`;



data.visits.forEach(v=>{


box.innerHTML+=`

<div class="admin-row">


<span>
🌐 ${v.ip}
</span>


<span>
${v.browser}
</span>


<span>
${v.device}
</span>


<span>
${v.created_at}
</span>


</div>

`;


});



}catch(err){


console.error(
"Visits error",
err
);


box.innerHTML=
"Ошибка загрузки посещений";


}


}





// ===============================
// USER MODAL
// ===============================


function openUserModal(user){


const modal =
document.getElementById(
"userModal"
);


const content =
document.getElementById(
"userModalContent"
);



content.innerHTML=`

<h2>
Пользователь #${user.id}
</h2>


<p>
👤 ${user.name || "Без имени"}
</p>


<p>
📧 ${user.email}
</p>


<p>
📅 ${user.created_at}
</p>


<p>
🔵 Google:
${user.via_google ? "Да":"Нет"}
</p>


`;



modal.style.display="flex";


}



function closeUserModal(){


document.getElementById(
"userModal"
).style.display="none";


}




// ===============================
// START
// ===============================


document.addEventListener(
"DOMContentLoaded",
()=>{


if(localStorage.getItem("admin_token")){

loadStats();

}


});
