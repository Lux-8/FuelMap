document
.querySelectorAll(".filters button")
.forEach(button=>{

button.onclick=()=>{

document
.querySelectorAll(".filters button")
.forEach(b=>b.classList.remove("active"));

button.classList.add("active");

};

});