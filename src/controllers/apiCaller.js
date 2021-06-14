export default async function apiCaller(type, station) {
  var myHeaders = new Headers();
  myHeaders.append("Authorization", process.env.REACT_APP_AVWX_APIKEY);

  var requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  var apiResponse = await fetch(`https://avwx.rest/api/${type}/${station}`, requestOptions)
    .then((response) => response.json())
    .catch((error) => console.error(error));

  return apiResponse;
}
