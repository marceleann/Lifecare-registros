import fs from 'fs';
import https from 'https';

https.get('https://upload.wikimedia.org/wikipedia/commons/e/ea/Warning_Siren.ogg', res => {
  if (res.statusCode === 200) {
      res.pipe(fs.createWriteStream('public/siren.ogg'));
      console.log('Siren downloaded.');
  } else if (res.statusCode === 302 || res.statusCode === 301) {
      https.get(res.headers.location, res2 => {
         res2.pipe(fs.createWriteStream('public/siren.ogg'));
         console.log('Siren downloaded from redirect.');
      });
  } else {
      console.log('Failed siren:', res.statusCode);
  }
});

https.get('https://upload.wikimedia.org/wikipedia/commons/2/23/Buzzer.ogg', res => {
  if (res.statusCode === 200) {
      res.pipe(fs.createWriteStream('public/buzzer.ogg'));
      console.log('Buzzer downloaded.');
  } else if (res.statusCode === 302 || res.statusCode === 301) {
      https.get(res.headers.location, res2 => {
         res2.pipe(fs.createWriteStream('public/buzzer.ogg'));
         console.log('Buzzer downloaded from redirect.');
      });
  } else {
      console.log('Failed buzzer:', res.statusCode);
  }
});
