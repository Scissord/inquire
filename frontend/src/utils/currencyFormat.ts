export const currencyFormat =(value:number)=>{
    return new Intl.NumberFormat('ru-KZ',{
        style:"currency",
        currency:"KZT",
        minimumFractionDigits:0,
        maximumFractionDigits:0,
    }).format(value);
};