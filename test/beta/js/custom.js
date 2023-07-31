function menuShow() {
   var element = document.getElementById("nav-bar-das");
   element.classList.toggle("open");
}
$(document).ready(function(){
  $(".mobile-close-button").click(function(){
    $("#nav-bar-das").removeClass("open");
  });
});