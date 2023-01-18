/*
功能：photoshop脚本从exif获取日期，自动添加日期水印。如没有exif日期信息，则从xmp信息从读取日期。
作者：leongongye, https://github.com/leongongye
参考：laozeng, https://github.com/laozeng1024，感谢！
*/

//自定义字符串，如“@上海”，使用urlencode编码
var customStr = "%40%E4%B8%8A%E6%B5%B7";
//exif中“日期时间”字段名称，urlencode编码
var photoTimeStr = "%E6%97%A5%E6%9C%9F%E6%97%B6%E9%97%B4";
//exif中“日期戳”字段名称，urlencode编码
var photoTimeStr2 = "%E6%97%A5%E6%9C%9F%E6%88%B3";
//"原始日期时间"
var photoTimeStr3 = "%E5%8E%9F%E5%A7%8B%E6%97%A5%E6%9C%9F%E6%97%B6%E9%97%B4";

var inputFolder = Folder.selectDialog("请选择需要添加日期水印图片所在文件夹：");
var outFolder = Folder.selectDialog("选择图片保存输出的文件夹：");

//判断文件夹是否存在
if (inputFolder != null && inputFolder != null) {
    //获得文件夹下的所有图片
    var fileList = inputFolder.getFiles();

    //遍历图片
    for (var i = 0; i < fileList.length; i++){
        //判断图片是否正常文件，并且处于非隐藏状态
        if (fileList[i] instanceof File && fileList[i].hidden == false) {       
            //打开遍历到的图片
            var docRef = open(fileList[i]);

            //设置另存路径文件名，重命名为:new_原文件名
            var fileout = new File(outFolder+'/new_'+ basename(fileList[i]))

            // 旋转照片
            if(docRef.width > docRef.height){
                docRef.rotateCanvas(90);
            }

            // 添加水印
            addDateTimeWatermark(docRef);

            //另存照片
            saveDocAsCopy(docRef);
        }
    }
    alert("添加日期水印，已处理完成！")
}

function saveDocAsCopy(docRef) {
    //定义一个变量[asCopy]，用来指定图片以副本的方式保存
    var asCopy = true;

    //定义一个变量[extensionType]，用来指定图片名称的后缀为小写的.jpg
    var extensionType = Extension.LOWERCASE;

    //定义一个变量[options]，用来指定图片保存的格式为JPG。PNG为PNGSaveOptions
    var jpegSaveOptions = JPEGSaveOptions;
    jpegSaveOptions.embedColorProfile = true;  
    jpegSaveOptions.formatOptions = FormatOptions.STANDARDBASELINE;  
    jpegSaveOptions.matte = MatteType.NONE;  
    jpegSaveOptions.quality = 10;

    docRef.saveAs(fileout, jpegSaveOptions, asCopy, extensionType);
    
    //操作完成后，直接关闭文档
    docRef.close(SaveOptions.DONOTSAVECHANGES);
}


function addDateTimeWatermark(docRef) {
    //获得exif照片日期，可自行加自定义文字customStr
    //photoTime = getExifData(docRef) + decodeURIComponent(customStr)
    photoTime = getDocCreateTime(docRef)

    //如果exif没有日期数据，从文件名读取
    if (photoTime == 0){
        photoTime = basename(fileList[i])
        photoTime = photoTime.toString().slice(0, -4)
    }

    //新建图层
    var layerRef = docRef.artLayers.add();

    //设置为文字图层
    layerRef.kind = LayerKind.TEXT;

    //设置图层文字
    layerRef.textItem.contents = photoTime;

    //根据图片宽度比例，设置文字大小
    layerRef.textItem.size = docRef.width/25/(docRef.resolution/72); //默认分辨率72，根据分辨率修改pt
    layerRef.textItem.font = "LetsgoDigital-Regular"; //设置字体

    // gimmePostScriptFontName("asdfasdf");

    //定义颜色
    var color = new RGBColor();

    //设置red属性
    color.red = 235;

    //设置green属性
    color.green = 175;

    //设置blue属性
    color.blue = 12;
    
    //定义水印文字的颜色
    var sc = new SolidColor();

    //设置[sc]对象的[rgb]属性的值为变量[color]
    sc.rgb = color;

    //将文本图层的字体颜色设置为变量[sc]
    layerRef.textItem.color = sc;

    //设置文本图层透明度
    layerRef.fillOpacity = 90;

    //将文本图层向下移动。调节日期水印左右和上下位置
    // layerRef.translate(250, docRef.height/1.15 - 72);
    layerRef.translate(docRef.width/1.65, docRef.height/1.15);

    //合并文本图层至背景图层
    layerRef.merge();
}



function getCreateDateFromXmp(doc) {
    var ns = "http://ns.adobe.com/xap/1.0/";
    ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
    xmpMeta = new XMPMeta(doc.xmpMetadata.rawData);
    var theValue = xmpMeta.getProperty(ns, "CreateDate");
    return theValue;
}

//获取exif中的日期
function getDocCreateTime(doc) {

    var exifData = doc.info.exif;

    var photoTime = 0

    //1. 优先从 exif 里取
    for(j = 0; j < exifData.length; j++ ) 
    {
        encodeStr = encodeURIComponent(exifData[j][0]);
        switch(encodeStr)
        {   
            //urlencode 中文再判断
            //日期时间
            case photoTimeStr: case photoTimeStr2: case photoTimeStr3:
                photoTime = exifData[j][1];

                p = photoTime.split(" ")
                // 2020:10:11 12:08:33 替换为2020-10-11 12:08:33
                // 格式 2023-01-13 14:23:58
                // photoTime = p[0].replace(/:/g,"-")+" "+p[1]
                photoTime = p[0].replace(/:/g,"-")
                break;
        }

    } 

    if(photoTime==0){
        // 2. 最后从 xmp 数据里取，原始格式 2023-01-14T10:11:07+08:00
        var xmpCreateDateStr = getCreateDateFromXmp(doc)+"";
        var sp = xmpCreateDateStr.split("T");
        // photoTime = sp[0]+" "+sp[1].substring(0,8);
        // photoTime = sp[0].replace(/-/g,"/")
        photoTime = sp[0]

        /*
        if(doc.info.creationDate){
            // 2. 从doc的creationDate 里取，格式 20230113
            // photoTime = doc.info.creationDate+"-D";
            photoTime = getCreateDateFromXmp(doc)+"-X";
        }else{
            // 3. 最后从 xmp 数据里取，原始格式 2023-01-14T10:11:07+08:00
            photoTime = getCreateDateFromXmp(doc)+"-X";
        }
        */
    }

    // alert(photoTime);
    return photoTime;

}

function ShowTheObject(obj){
  var des = "";
    for(var name in obj){
        // des += name + ";";
        des += name + ":" + obj[name] + ";";
    }
  return des;
}

//获取文件名
function basename(str) {
    str = str.toString();
    var idx = str.toString().lastIndexOf('/')
    idx = idx > -1 ? idx : str.lastIndexOf('\\')
    if (idx < 0) {
        return str
    }
    return str.substring(idx + 1);
}

//获取字体
function gimmePostScriptFontName(f)
{
  numOfFonts = app.fonts.length;
  // var s = "";
  for (var i = 0, numOfFonts; i < numOfFonts; i++)
  {
    fnt = app.fonts[i].name;
    // s += app.fonts[i].name + "***" + app.fonts[i].postScriptName + ";\n";

    if (f == fnt)
    {
      return app.fonts[i].postScriptName;
    }
  }
}
