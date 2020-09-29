// (function() {
//     $('.panel').hover(function() {
//         return $(this).find('i').removeClass('fa-lock').addClass('fa-unlock');
//     }, function() {
//         return $(this).find('i').removeClass('fa-unlock').addClass('fa-lock');
//     });
//
// }).call(this);

let test_button = document.getElementById('test');
let test_still_button = document.getElementById('test_still');
let lock = document.getElementsByClassName('panel');
let unlocked = false;
let still_lock = false;
test_button.onclick = function () {
    if (unlocked === false) {
        let i;
        for (i = 0; i < lock.length; i++) {
            lock[i].classList.add('panel_unlocked');
            lock[i].querySelector('.fa').classList.remove('fa-lock');
            lock[i].querySelector('.fa').classList.add('fa-unlock');
        }
        unlocked = true;
    }
    else {
        let i;
        for (i = 0; i < lock.length; i++) {
            lock[i].classList.remove('panel_unlocked');
            lock[i].querySelector('.fa').classList.remove('fa-unlock');
            lock[i].querySelector('.fa').classList.add('fa-lock');
        }
        unlocked = false;
    }

};

// test_still_button.onclick = function () {
//     if (still_lock === false) {
//         let i;
//         for (i = 0; i < lock.length; i++) {
//             lock[i].classList.add('panel_still_locked');
//         }
//         still_lock = true;
//     }
//     else {
//         let i;
//         for (i = 0; i < lock.length; i++) {
//             lock[i].classList.remove('panel_still_locked');
//         }
//         still_lock = false;
//     }
//
// };

test_still_button.onclick = function () {

    let i;
    for (i = 0; i < lock.length; i++) {
        lock[i].classList.remove('panel_still_locked');
    }
    setInterval(function () {
        for (i = 0; i < lock.length; i++) {
            lock[i].classList.add('panel_still_locked');
        }
    }, 3000);

};