const options = {
    method: 'GET',
    headers: {
        'X-RapidAPI-Key': '502338db98msha7ce61b61e031fcp191337jsn53b497de916',
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
    }
};

fetch('https://aerodatabox.p.rapidapi.com/flights/number/IB3166', options)
    .then(res => res.json())
    .then(json => console.log(JSON.stringify(json, null, 2)))
    .catch(err => console.error('error:' + err));
