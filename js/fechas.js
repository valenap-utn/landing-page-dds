
export const setearInputFecha= (fechaID) => {
    window.addEventListener('load',function(){

        document.getElementById(fechaID).type= 'text';

        document.getElementById(fechaID).addEventListener('blur',function(){

            document.getElementById(fechaID).type= 'text';

        });

        document.getElementById(fechaID).addEventListener('focus',function(){

            document.getElementById(fechaID).type= 'date';

        });

    });
}