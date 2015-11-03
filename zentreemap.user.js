// ==UserScript==
// @name         zentreemap
// @namespace    http://your.homepage/
// @version      0.2
// @description  test
// @author       krasnov
// @match        https://zenmoney.ru/a/*
// @grant        none
// ==/UserScript==
var globalTitle = "Категории";

function httpGetSync(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", theUrl, false); // synchronous 
    xmlHttp.send(null);
    return xmlHttp.responseText;
}
function getJSON(url)
{
    var r = httpGetSync(url);
    var d = JSON.parse(r);
    return d;
}
function getTransactions()
{
    var date = new Date(), y = date.getFullYear(), m = date.getMonth();
    var fD = new Date(y, m-3, 1);
    var lD = new Date(y, m + 1, 0);
    
    var fDs = fD.toFormat('%Y-%m-%d');
    var lDs = lD.toFormat('%Y-%m-%d');
    //return getJSON("https://zenmoney.ru/api/v2/transaction/?date_between%5B%5D="+fDs+"&date_between%5B%5D="+lDs+"&skip=0&type_notlike=uit&finder=");
    return getJSON("https://zenmoney.ru/api/v2/transaction?limit=null&type_notlike=uit&date_between%5B%5D="+fDs+"&date_between%5B%5D="+lDs);
}
function getProfile()
{
    //return getJSON("https://zenmoney.ru/s1/profile");
    return zm.profile;
}

function agregateTransactions()
{
    var p = getProfile();
    var t = getTransactions();
    
    var d = [];
    
    t.filter(function(tr){ 
        return tr.tag_groups !== null;
    }).forEach(function(tr, i, arr) {
        var sum = parseFloat(tr.outcome);
        var cat0 = parseInt(p.tag_groups[tr.tag_groups[0]].tag0);
        var cat1 = parseInt(p.tag_groups[tr.tag_groups[0]].tag1);

        var add = function(cat,pcat,sum)
        {
            if (cat==null || isNaN(cat) || cat==undefined) return;
            
            var tag = p.tags[cat].id;
            var tagTitle = p.tags[cat].title;
            var ptagTitle = (pcat!=null)?p.tags[pcat].title:globalTitle;
            if (d[tag] === undefined)
            {
                d[tag] = { "id": ptagTitle+tagTitle, "title": tagTitle, "pid": globalTitle+ptagTitle, "sum": sum };
            }
            else
            {
                d[tag].sum = d[tag].sum+sum;
            }        
        }
        add(cat0,null,sum);
        add(cat1,cat0,sum);
    });
    
    console.log(d);
    return d;
}

function convertToDataTable(aggregated)
{
    var arr = [["T1","T2","T3","T4"],[{v:globalTitle+globalTitle, f:globalTitle},null,0,0]];
    var r = [];

    aggregated.forEach(function(ag){
        //arr.push([ag.title,ag.ptitle,parseInt(ag.sum),parseInt(ag.sum)]);
        arr.push([{v:ag.id, f:ag.title + " ("+ag.sum+")"},ag.pid,parseInt(ag.sum),parseInt(ag.sum)]);
        
    });

    console.log(arr);
    return arr;
}

function drawTree(drawId,datatable)
{
    google.load("visualization", "1", {packages:["treemap"], callback: drawChart});
    
    function drawChart() {
        var data = google.visualization.arrayToDataTable(datatable);
console.log(data);
        tree = new google.visualization.TreeMap(document.getElementById(drawId));

        tree.draw(data, {
            highlightOnMouseOver: true,
            maxDepth: 1,
            maxPostDepth: 2,
            minHighlightColor: '#8c6bb1',
            midHighlightColor: '#9ebcda',
            maxHighlightColor: '#edf8fb',
            minColor: '#009688',
            midColor: '#f7f7f7',
            maxColor: '#ee8100',
            headerHeight: 15,
            showScale: true,
            height: 500,
            useWeightedAverageForAggregation: true
        });
      }
}

function main() {
    var dt = convertToDataTable(agregateTransactions());
    var script = document.createElement("script");
    script.setAttribute("src", "//www.google.com/jsapi");
    script.addEventListener("load",function() {drawTree("tree_place",dt)});
    document.body.appendChild(script);
}

$(function () {
    $('#header').append("<div id='tree_place' style='width: 100%; height: 500px;'></div>");
    //$('#header').append("<div id='tree_place'></div>");
    setTimeout(main, 1000);
    //main();
});
