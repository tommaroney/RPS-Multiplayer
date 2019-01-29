$(document).ready(function () {
    $(".tokens").on("click", function(event) {
        $(this).remove();
        $("#gameSpace").append($(this).attr("class", "tokens h-75 align-self-center"));
    });
});