---
title: "كتابة اوامر Redis"
description: ""
lead: ""
date: 2023-03-30T00:00:00+02:00
lastmod: 2023-03-31T00:00:00+02:00
draft: false
images: []
weight: 100
toc: true
---

بسم الله الرحمن الرحيم

في الجزء الثالث احنا كتبنا الـ Serializer و عرفنا ازاي هنقدر نرد علي الـ Client بعد كدا لما يبعتلنا اي commands.

الجزء ده هنبني الـ CommandsHandler و نبدا ندمع شويه commands من Redis.


## الـ CommandsHandler

اتكلمنا قبل كدا ان الريكوست اللي هيجيلنا من ال Client هيبقي RESP Array بتقولنا ايه الكوماند اللي هيبعتلنا.

ف احنا دايما الـ Handler عندنا هنعرفه عن طريق الـ command name اللي هو اول عنصر في الـ RESP Array و الباقي هيكون الـ arguments.

ف خلينا نعمل ملف جديد handler.go و نعرف فيه الـ Handler بتاعنا


```go
var Handlers = map[string]func([]Value) Value
```


و هنكتب دلوقتي اول Command اللي هو الـ [PING](https://redis.io/commands/ping).

```go
func ping(args []Value) Value {
	return Value{typ: "string", str: "PONG"}
}
```


و هنزود ف الhandler map اللي عملناها من شويه الـ PING command ده


```go
var Handlers = map[string]func([]Value) Value{
	"PING": ping,
}
```


لاحظ اننا كتبنا اسم الـ command capital لان الاوامر دي في redis بتبقي case insensitive.

و علشان نجرب  PING command هنبدا نغير في الـ main.go انه يبعت الـ Value object لل handler


```go
for {
	resp := NewResp(conn)
	value, err := resp.Read()
	if err != nil {
		fmt.Println(err)
		return
	}

	if value.typ != "array" {
		fmt.Println("Invalid request, expected array")
		continue
	}

	if len(value.array) == 0 {
		fmt.Println("Invalid request, expected array length > 0")
		continue
	}

	command := strings.ToUpper(value.array[0].bulk)
	args := value.array[1:]

	writer := NewWriter(conn)

	handler, ok := Handlers[command]
	if !ok {
		fmt.Println("Invalid command: ", command)
		writer.Write(Value{typ: "string", str: ""})
		continue
	}

	result := handler(args)
	writer.Write(result)
}
```


اللي احنا عملناه اننا استقبلنا الـ Request الاول واخدنا منه الـ Value object. بعدها عملنا شويه validations علشان نتاكد ان الكوماند ده array و مش فاضي. وبعدها اخدنا اول عنصر في الarray وحولناه uppercase علشان ده هيبقي اسم الcommand. و ال arguments هيبقي باقي عناصر الـarray

ولو الكلام مش واضح بالنسبالك، ف ده شكل Value object لما نقول مثلا SET name Ahmed


```go
Value{
	typ: "array",
	array: []Value{
		Value{typ: "bulk", bulk: "SET"},
		Value{typ: "bulk", bulk: "name"},
		Value{typ: "bulk", bulk: "Ahmed"},
	},
}
```


بالتالي الكود اللي فوق ده هخلي ال command و الـ args شكلهم كدا


```go
command := Value{typ: "bulk", bulk: "SET"}.bulk // "SET"

args := []Value{
	Value{typ: "bulk", bulk: "name"},
	Value{typ: "bulk", bulk: "Ahmed"},
}
```


طيب في Redis الـ PING command بتاخد argument وبترجعه بدل كلمه PONG لو موجود. ف لو جينا نطبق ده


```go
func ping(args []Value) Value {
	if len(args) == 0 {
		return Value{typ: "string", str: "PONG"}
	}

	return Value{typ: "string", str: args[0].bulk}
}
```


![Redis PING command](/images/build-redis-from-scratch/part-4/redis-ping-command.png)

## الـ SET & GET commands

الخطوات اللي جايه هتبقي كلها سهله و معتمده علي معرفتك بـ Go والـ Datastructures. لان الجزء الصعب احنا خلصناه لما عملنا الـ RESP والـ Handler

الـ Sets في redis عباره عن key value. في اي وقت هتعمل SET لـ key بـ value معينه. و ف اي وقت تقدر تجيبها تاني بالـ GET command.

ف الـ Datastructure اللي هنستخدمها هي map[string]string

ف هنروح فالـ handler.go و هنعرف الـ SET command


```go
var SETs = map[string]string{}
var SETsMu = sync.RWMutex{}

func set(args []Value) Value {
	if len(args) != 2 {
		return Value{typ: "error", str: "ERR wrong number of arguments for 'set' command"}
	}

	key := args[0].bulk
	value := args[1].bulk

	SETsMu.Lock()
	SETs[key] = value
	SETsMu.Unlock()

	return Value{typ: "string", str: "OK"}
}
```


بنستخدم الـ sync.RWMutex لان المفروض ان الـ Server بتاعنا هيستقبل الـ requests بشكل concurrent. و بنستخدم الـ RWMutex علشان نتاكد ان الـ SETs map مش هتتعدل من اكثر من thread في نفس الوقت.

اتوقع انك متخيل الـ Get command هيبقي عامل ازاي. بس بكل بساطه لو لقينا الـ Key هنرجعه .. ولو مش موجود هنرجع nil


```go
func get(args []Value) Value {
	if len(args) != 1 {
		return Value{typ: "error", str: "ERR wrong number of arguments for 'get' command"}
	}

	key := args[0].bulk

	SETsMu.RLock()
	value, ok := SETs[key]
	SETsMu.RUnlock()

	if !ok {
		return Value{typ: "null"}
	}

	return Value{typ: "bulk", bulk: value}
}
```


وبعد ما عملنا الـ SET & GET commands هنسجلهم في الـ Handlers map


```go
var Handlers = map[string]func([]Value) Value{
	"PING": ping,
	"SET":  set,
	"GET":  get,
}
```



## الـ HSET & HGET commands

بكل بساطة دي عبارة عن Hash table. وهي عبارة عن map[string]map[string]string. بتاخد اسم الـ hash و بعدين الـ key و الـ value. علشان مثلا تخزن بيانات زي


```go
{
	"users": {
		"u1": "Ahmed",
		"u2": "Mohamed",
	},
	"posts": {
		"p1": "Hello World",
		"p2": "Welcome to my blog",
	},
}
```


ف مثلا لو هنخزن الـ user اللي اسمه Ahmed بـ ID u1. هنستخدم الـ HSET command


```bash
HSET users u1 Ahmed
```

ولو هنخزن الـ post اللي اسمه Hello World بـ ID u1. هنستخدم الـ HSET command


```bash
HSET posts u1 Hello World
```


ولو هنعمل GET لـ user Ahmed هنستخدم الـ HGET command


```bash
HGET users u1
```


الكود هيبقي قريب جدا من الـ SET & GET commands. الفرق بينهم ان الـ HSETs هيكون map[string]map[string]string


```go
var HSETs = map[string]map[string]string{}
var HSETsMu = sync.RWMutex{}

func hset(args []Value) Value {
	if len(args) != 3 {
		return Value{typ: "error", str: "ERR wrong number of arguments for 'hset' command"}
	}

	hash := args[0].bulk
	key := args[1].bulk
	value := args[2].bulk

	HSETsMu.Lock()
	if _, ok := HSETs[hash]; !ok {
		HSETs[hash] = map[string]string{}
	}
	HSETs[hash][key] = value
	HSETsMu.Unlock()

	return Value{typ: "string", str: "OK"}
}
```


والـ HGET هيبقي عامل كدا


```go
func hget(args []Value) Value {
	if len(args) != 2 {
		return Value{typ: "error", str: "ERR wrong number of arguments for 'hget' command"}
	}

	hash := args[0].bulk
	key := args[1].bulk

	HSETsMu.RLock()
	value, ok := HSETs[hash][key]
	HSETsMu.RUnlock()

	if !ok {
		return Value{typ: "null"}
	}

	return Value{typ: "bulk", bulk: value}
}
```


كدا احنا عملنا الـ HSET & HGET commands. فيه كوماند زياده المره دي عن الـSETS اسمه HGETALL. وده بيرجع كل الـ keys و الـ values في الـ hash


```bash
> HGETALL users

u1 Ahmed
u2 Mohamed
```


ولكن تطبيقه هيبقي سهل لان الـ Value object بيقدر يشيل الـ bulk data و يرجعها كـ map[string]string


```go
func hgetall(args []Value) Value {
	if len(args) != 1 {
		return Value{typ: "error", str: "ERR wrong number of arguments for 'hgetall' command"}
	}

	hash := args[0].bulk

	HSETsMu.RLock()
	value, ok := HSETs[hash]
	HSETsMu.RUnlock()

	if !ok {
		return Value{typ: "null"}
	}

	values := []Value{}
	for k, v := range value {
		values = append(values, Value{typ: "bulk", bulk: k})
		values = append(values, Value{typ: "bulk", bulk: v})
	}

	return Value{typ: "array", array: values}
}
```


بكل بساطه بعد ما نجيب الـ key,value من ال Hash. هنعمل loop علي كل key, value و هنخزنهم في array. وبعدين هنرجع الـ array كـ Value object.

اخر خطوه محتاجينها اننا نسجل الـ commands دي في الـ Handlers map


```go
var Handlers = map[string]func([]Value) Value{
	"PING":    ping,
	"SET":     set,
	"GET":     get,
	"HSET":    hset,
	"HGET":    hget,
	"HGETALL": hgetall,
}
```


![Redis HSET & HGET commands](/images/build-redis-from-scratch/part-4/redis-hash-command.png)

## الخاتمه

لغايه الجزء ده. احنا كدا عملنا InMemory database و نقدر نقول انها compatible مع الـ Redis Server في الـ commands اللي احنا
بنعملها support. الاختلاف مع ريدس هو باقي الـ commands اللي احنا لسه مش بنعملها support. و دي هنا ممكن تعتبر challenge ليك
انك تبدا تشوف ايه الـ commands اللي انت حابب تعملها بنفسك و تجرب.

المشكله الحاليه ان البيانات اللي بنخزنها بنفقدها تمام لاننا معتمدين عالـ memory فقط.  ف ان شاء الله الجزء اللي جاي هيكون اخر خطوه محتاجينها وهو الـ Data persistence وهنشوف ازاي ممكن نستخدم الـ [AOF](https://redis.io/topics/persistence#append-only-file) علشان نحفظ الـ data في الـ disk.
وازاي نقدر نقراها تاني لما الـ server يعمل bootstrap.
