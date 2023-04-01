---
title: "كتابه السيرفر"
description: ""
lead: ""
date: 2023-03-30T00:01:00+02:00
lastmod: 2023-03-30T01:00:00+02:00
draft: false
images: []
menu:
  docs:
    parent: "docs"
weight: 1
toc: true
---

## مقدمة

خلينا الاول نشرح امثله لـRedis بيشتغل ازاي. مثلا الـ Strings بتسجل بيه key, value.

 الـKey هيبقي string والـvalue هتبقي serialized object من اي type زي array, integer, boolean


```bash
SET admin ahmed
```

```bash
> GET admin

"ahmed"
```



الطريقة اللي Redis بيستقبل بيها الاوامر دي عن طريق Serialization Protocol اسمه [RESP (Redis serialization protocol)](https://redis.io/docs/reference/protocol-spec/).

ف لو بصينا ازاي `SET admin ahmed` بيتم ارسالها كـ serialized message لـRedis هتبقي بالشكل ده


```bash
*3\r\n$3\r\nset\r\n$5\r\nadmin\r\n$5\r\nahmed
```


وعلشان نبسط شكلها اكتر


```bash
*3
$3
set
$5
admin
$5
ahmed
```


لو بصيت علي الـRESP هتلاقيه بيقولنا كل علامه من دول ايه معناها

- '*' بتقول ان عندنا array حجمها 3.. بالتالي احنا هنقرا 6 سطور. كل سطرين بيمثلو نوع الobject و حجمه و السطر التاني قيمه الاوبجكت ده
- '$' بتقول انه string عدد حروفه 5. اذن السطر اللي بعده هيبقي فيه 5 حروف فقط


بردو لما بنقول `GET admin` بيرجع نفس شكل الـObject مع اختلاف القيم




```bash
$5\r\nahmed\r\n
```

```bash
$5
ahmed
```


ف اللي احنا هنعمله اننا هنبني نفس الـserializer ومن خلاله هنقدر نكلم الـ Server بتاعنا باي Redis Client علشان نبعتله commands زي Redis بالظبط.

## هنبني ايه؟

اولاً المطلوب منك قبل ما تقرا السلسله دي، انك تكون:

- عارف الاساسيات في Redis او استخدمته قبل كدا علي الاقل.
- تعرف Golang او ع الاقل قرات الكود بتاعها قبل كدا.

اللي هنعمله اننا:

- هنبني Redis clone بتقدر من خلاله تستخدم [strings](https://redis.io/docs/data-types/strings/) و [hashes](https://redis.io/docs/data-types/hashes/).
- هنكتب Parser علشان نقدر نفهم RESP و منه السيرفر يقدر يستقبل  commands و يرد بـ responses.
- هنسخدم go routines علشان نقدر نستقبل اكتر من connection في نفس الوقت
- و هنكتب البيانات علي الـDisk عن طريق الـ [Append File Only (AOF)](https://redis.io/docs/management/persistence/) ودي طريقه Redis بيستخدمها من ضمن عده طرق تانيه عنده. بالتالي السيرفر لو حصله crash او restart نقدر نرجع البيانات تاني


### الجزء الاول: بناء المشروع

بافتراض انك تعرف Golang و كتبت بيها قبل كدا. كل اللي هنحتاج نعمله في الـ main اننا هنعمل server و نستخدم نفس Redis port اللي هو 6379. وهنبدا نستقبل connections و نرد ب message واحده بتقول Ok


الوا محتاجين نبدا TCP listener علشان اي client يقدر يكلمه


```go
l, err := net.Listen("tcp", ":6379")
if err != nil {
    fmt.Println(err)
    return
}
```


بعدين هنبدا نستقبل requests


```go
conn, err := l.Accept()
if err != nil {
    fmt.Println(err)
    return
}

defer conn.Close() // close connection once finished
```


بعدها هنعمل inifine loop و نستقبل commands من ال clients و قندر نرد عليهم


```go
for {
    buf := make([]byte, 1024)

    // read message from client
    _, err = conn.Read(buf)
    if err != nil {
        if err == io.EOF {
            break
        }
        fmt.Println("error reading from client: ", err.Error())
        os.Exit(1)
    }

    // ignore request and send back a PONG
    conn.Write([]byte("+OK\r\n"))
}
```


خلي بالك في اخر سطر احنا بنرد بـ Ok اي كان ال command اللي بيجيلنا من ال client.

بالتالي الكود كله هيبقي



```go
package main

import (
	"fmt"
	"io"
	"net"
	"os"
)

func main() {
	fmt.Println("Listening on port :6379")

	// Create a new server
	l, err := net.Listen("tcp", ":6379")
	if err != nil {
		fmt.Println(err)
		return
	}

	// Listen for connections
	conn, err := l.Accept()
	if err != nil {
		fmt.Println(err)
		return
	}

	defer conn.Close()

	for {
		buf := make([]byte, 1024)

		// read message from client
		_, err = conn.Read(buf)
		if err != nil {
			if err == io.EOF {
				break
			}
			fmt.Println("error reading from client: ", err.Error())
			os.Exit(1)
		}

		// ignore request and send back a PONG
		conn.Write([]byte("+OK\r\n"))
	}
}
```



لو جربنا نشغل الـserver و نكلمه بـ redis-cli هنقدر نشوف الـResponse اللي متوقعينه

![CLI OUTPUT](/images/build-redis-from-scratch/part-1/cli-output.png)

## الخاتمه

كدا احنا خلصنا اول جزء و اللي فيه عملنا server يقدر اي redis client يكلمه و يستقبل منه responses.

حاليا هو ريسبونس واحد Ok. ولكن في المقالات الجايه هنبدا نغير ده علشان نرد علي اوامر زي set, get, hset, hset.

