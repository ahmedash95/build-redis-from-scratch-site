---
title: "كتابة الـ RESP"
description: ""
---



بسم الله الرحمن الرحيم

في الجزء الثاني احنا كتبنا اول جزء من الـ RESP وهو ال Parsing والمسؤول عن تحويل الـ RESP الى الـ Value Object نقدر
نعرف منه الـ Client بعت اي commands.  في الجزء ده هنشوف ازاي ممكن نرد على الـ Client بـ RESP ونكتب الـ Writer.


بما اننا بنستخدم ال Value علشان نحول الـ RESP ل Go struct نقدر نفهم منه ايه المطلوب .. هنستخدم بردو الـ Value علشان
نسجل فيه الرد اللي احنا هنرد بيه علي الـclient سواء String, Bulk or Array.

ف اول خطوة محتاجين نعملها اننا نكتب الـ Marshal اللي هيحول الـ Value لـ bytes عباره عن RESP response.

- هنكتب الاول ميثود Marshal و اللي منها هنكلم الميثود الخاصه بكل type حسب نوع الـ Value

```go
func (v Value) Marshal() []byte {
	switch v.typ {
	case "array":
		return v.marshalArray()
	case "bulk":
		return v.marshalBulk()
	case "string":
		return v.marshalString()
	case "null":
		return v.marshallNull()
	case "error":
		return v.marshallError()
	default:
		return []byte{}
	}
}
```

كالعاده، هنشوف الtyp نوعها ايه و منها هنكلم الميثود اللي بتتعامل مع النوع ده

- اول type هتكون الـ Simple String لانها سهله
```go
func (v Value) marshalString() []byte {
	var bytes []byte
	bytes = append(bytes, STRING)
	bytes = append(bytes, v.str...)
	bytes = append(bytes, '\r', '\n')

	return bytes
}
```

بكل بساطه بنعمل byte array و بنضيف الـ String ثم الـ [CRLF](https://developer.mozilla.org/en-US/docs/Glossary/CRLF).
وخلي بالك من غير الـ CRLF هيحصل مشكله لان RESP client مش هيفهم الريسبونس من غيره.

- الـنوع التاني هنعمل Bulk Strings

```go
func (v Value) marshalBulk() []byte {
	var bytes []byte
	bytes = append(bytes, BULK)
	bytes = append(bytes, strconv.Itoa(len(v.bulk))...)
	bytes = append(bytes, '\r', '\n')
	bytes = append(bytes, v.bulk...)
	bytes = append(bytes, '\r', '\n')

	return bytes
}
```

- الـ Array

```go
func (v Value) marshalArray() []byte {
	len := len(v.array)
	var bytes []byte
	bytes = append(bytes, ARRAY)
	bytes = append(bytes, strconv.Itoa(len)...)
	bytes = append(bytes, '\r', '\n')

	for i := 0; i < len; i++ {
		bytes = append(bytes, v.array[i].Marshal()...)
	}

	return bytes
}
```

لاحظ ان فيه حاله الـ Array احنا جوا ال loop بنكلم Marshal method علي ال Value Object علشان نحوله ايا كان نوعه ايه. وهو ده
المقصود بالـ Recursion اللي ذكرناه في الجزء الاول واحنا بنعمل Parse.

- واخيرا محتاجين الـ Null و الـ Error علشان لو هنرد علي الـ Client بان البيانات مش موجوده او فيه error.

```go
func (v Value) marshallError() []byte {
	var bytes []byte
	bytes = append(bytes, ERROR)
	bytes = append(bytes, v.str...)
	bytes = append(bytes, '\r', '\n')

	return bytes
}

func (v Value) marshallNull() []byte {
	return []byte("$-1\r\n")
}
```

وبكدا يبقي ملف الـ resp.go ده الجزء الزياده بالكامل اللي كتبناه

```go
// Marshal Value to bytes
func (v Value) Marshal() []byte {
	switch v.typ {
	case "array":
		return v.marshalArray()
	case "bulk":
		return v.marshalBulk()
	case "string":
		return v.marshalString()
	case "null":
		return v.marshallNull()
	case "error":
		return v.marshallError()
	default:
		return []byte{}
	}
}

func (v Value) marshalString() []byte {
	var bytes []byte
	bytes = append(bytes, STRING)
	bytes = append(bytes, v.str...)
	bytes = append(bytes, '\r', '\n')

	return bytes
}

func (v Value) marshalBulk() []byte {
	var bytes []byte
	bytes = append(bytes, BULK)
	bytes = append(bytes, strconv.Itoa(len(v.bulk))...)
	bytes = append(bytes, '\r', '\n')
	bytes = append(bytes, v.bulk...)
	bytes = append(bytes, '\r', '\n')

	return bytes
}

func (v Value) marshalArray() []byte {
	len := len(v.array)
	var bytes []byte
	bytes = append(bytes, ARRAY)
	bytes = append(bytes, strconv.Itoa(len)...)
	bytes = append(bytes, '\r', '\n')

	for i := 0; i < len; i++ {
		bytes = append(bytes, v.array[i].Marshal()...)
	}

	return bytes
}

func (v Value) marshallError() []byte {
	var bytes []byte
	bytes = append(bytes, ERROR)
	bytes = append(bytes, v.str...)
	bytes = append(bytes, '\r', '\n')

	return bytes
}

func (v Value) marshallNull() []byte {
	return []byte("$-1\r\n")
}

// Writer

type Writer struct {
	writer io.Writer
}

func NewWriter(w io.Writer) *Writer {
	return &Writer{writer: w}
}

func (w *Writer) Write(v Value) error {
	var bytes = v.Marshal()

	_, err := w.writer.Write(bytes)
	if err != nil {
		return err
	}

	return nil
}
```

<br>
كدا احنا خلصنا 90%  من الـ Writer و مش فاضل بس غير اننا نرد بيه علي الـ Client من الـ IO. ولكن خلينا الاول ناخد امثله
علي الكود بتاعنا ده و نشوف هيشتغل ازاي و نشوف الـ Output.


- لو هنرد مثلا بـ String Ok

```go
v := Value{typ: "string", str: "Ok"}
fmt.Println(string(v.Marshal()))
```

شكل الريسبونس هيبقي كدا

```bash
+Ok\r\n
```

- لو هنرد بـ Bulk String

```go
v := Value{typ: "bulk", bulk: "Hello World"}
fmt.Println(string(v.Marshal()))
```

شكل الريسبونس هيبقي كدا

```bash
$11\r\nHello World\r\n
```

- لو هنرد بـ Array

```go
v := Value{typ: "array", array: []Value{
	Value{typ: "string", str: "Hello"},
	Value{typ: "string", str: "World"},
}}
fmt.Println(string(v.Marshal()))
```

شكل الريسبونس هيبقي كدا

```bash
*2\r\n$5\r\nHello\r\n$5\r\nWorld\r\n
```

<br>

وبكدا يبقي احنا جاهزين بس نكتب الـ bytes اللي بناخدها من الـ Marshal method للـ Writer.

 و علشان نعمل writer
ف الموضوع بسيط خالص .. كل اللي محتاجينه Writer struct و بياخد io.Writer

```go
type Writer struct {
	writer io.Writer
}

func NewWriter(w io.Writer) *Writer {
	return &Writer{writer: w}
}
```

وبعدين بنعمل method بتاخد Value و بتكتب الـ bytes اللي بتاخدها من Marshal method علي الـ Writer

```go
func (w *Writer) Write(v Value) error {
	var bytes = v.Marshal()

	_, err := w.writer.Write(bytes)
	if err != nil {
		return err
	}

	return nil
}
```

وعلشان نستخدمه علشان مثلا نرد بـ Ok علي Redis commands كل اللي محتاجنيه هيكون

```go
writer := NewWriter(conn)
writer.Write(Value{typ: "string", str: "OK"})
```

# الخاتمه

كدا احنا خلصنا الـ RESP serialize and deserialize و عملنا الReader والـ Writer اللي هيساعدونا بكل سهوله نرد علي الـ Client

اخيرا هحتاج نغير main.go و نخليها ترد عن طريق الـ Writer

```go
package main

import (
	"fmt"
	"net"
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
		resp := NewResp(conn)
		value, err := resp.Read()
		if err != nil {
			fmt.Println(err)
			return
		}

		_ = value

		writer := NewWriter(conn)
		writer.Write(Value{typ: "string", str: "OK"})
	}
}
```

![cli output](/images/build-redis-from-scratch/part-3/cli-output.png)

الجزء اللي جاي ان شاء الله، هنبدا نرد علي كوماند زي [PING](https://redis.io/commands/ping/), [SET](https://redis.io/commands/set/), [GET](https://redis.io/commands/get/), [HSET](https://redis.io/commands/hset/), [HGET](https://redis.io/commands/hget/), and [HGETALL](https://redis.io/commands/hgetall/) و نشوف ازاي ممكن نعملهم
implement في Go.


