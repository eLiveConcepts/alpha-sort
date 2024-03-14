document.getElementById("sortButton").addEventListener("click", sortBookmarks);

// The below function simply calls the sorting function & closes the popup window once sorting is complete. This function exists as am extensibility layer in case we want to do different things with the sort in the future, such as reversing it, excluding folders, etc.
function sortBookmarks() {

  let sortDirection = "ascending";
  let organizeFirst = "folders";

  let sortDirectonRadioButtons = document.getElementsByName("sortDirection");
  let organizeFirstRadioButtons = document.getElementsByName("organizeFirst");

  // loop through the sort direction radio buttons to determine which one was selected
  for (let sortDirectionRadio of sortDirectonRadioButtons) {
    if (sortDirectionRadio.checked) {
      sortDirection = sortDirectionRadio.value;
    }
  }

  // loop through the organize first radio buttons to determine which one was selected
  for (var organizeFirstRadio of organizeFirstRadioButtons) {
    if (organizeFirstRadio.checked) {
      organizeFirst = organizeFirstRadio.value;
    }
  }

  // call the Chrome Bookmarks API to retrieve the user's bookmarks
  let chromeBoomarksPromise = chrome.bookmarks.getTree();

  // the above function retrieves a promise object, if retrieval is successful, the performSortBookmarks function will be called with an arrary of BookmarkTreeNode(s)
  chromeBoomarksPromise.then((value) => {
    performSortBookmarks(value,sortDirection,organizeFirst);
  }).catch((err) => {
    onFailure(err);
  });

  // close the popup window once the bookmarks have been sorted
  window.close();
}


// The below function performs the sorting by recursively calling itself while walking the bookmarks tree. The strategy is to go to the lowest level, i.e. no more folders, and then work backwards sorting & replacing child node arrays as we go
function performSortBookmarks(bookmarksArray,sortDirection,organizeFirst) {

  // loop through each item in the BookmarkTreeNode array
  for (let item of bookmarksArray) {

    if (item.hasOwnProperty("children") && item.children.length > 1) {
 
      // if this node has children, recurse before proceeding
      performSortBookmarks(item.children,sortDirection,organizeFirst);

      // create a list of sorted bookmark titles
      let arrayOfSortedChildrensTitles = sortChildrenTitles(item.children,sortDirection,organizeFirst);

      // create an array of bookmarks based upon the above array of sorted titles
      let arrayOfSortedChildren = sortChildrenByTitleArray(arrayOfSortedChildrensTitles, item.children);

      // we can't modify the main bookmarks container, so as long as we're not dealing with that item, iterate
      if (item.id != 0) {

        // loop through the sorted array of bookmarks
        for (let index = 0; index < arrayOfSortedChildren.length; index++) {
          let destinationObject = {
            index: index,
            parentId: item.id
          }

          // use the move method to move the current bookmark to its new location based upon our sorted list
          chrome.bookmarks.move(arrayOfSortedChildren[index].id,destinationObject);
        }
      }
    }
  }
}


// This function will take an array of bookmark children nodes and return a sorted array of their titles
function sortChildrenTitles(childrenArray,sortDirection = "ascending",organizeFirst = "all") {
  let sortedTitlesArray = [];

  // if we're not sorting all bookmarks equally, we'll need these arrays to separate bookmarks from folders
  let sortedFoldersArray = [];
  let sortedFilesArray = [];

  // loop through the bookmark array to act on each node
  for (let childNode of childrenArray) {

    // if we're not sorting all bookmarks equally
    if (organizeFirst != "all") {

      // if a bookmark node has children, it's a folder & should be added to that array before sorting
      if (childNode.hasOwnProperty("children")) {
        sortedFoldersArray.push(childNode.title);
        sortedFoldersArray.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);

        // if we want our bookmarks in descending order, reverse the previously sorted array
        if (sortDirection == "descending") {
          sortedFoldersArray.reverse();
        }
      }

      // if we're dealing with an actual bookmark node, add it to the appropriate array
      else {
        sortedFilesArray.push(childNode.title);
        sortedFilesArray.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);

        // if we want our bookmarks in descending order, reverse the previously sorted array
        if (sortDirection == "descending") {
          sortedFilesArray.reverse();
        }
      }
    }

    // if folders & bookmarks are to be treated equally, we only need to add them to a single array
    else {
      sortedTitlesArray.push(childNode.title);
      sortedTitlesArray.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);

      // if we want our bookmarks in descending order, reverse the previously sorted array
      if (sortDirection == "descending") {
        sortedTitlesArray.reverse();
      }
    }
  }

  // if we're not sorting all folders & bookmarks equally, join our two individually sorted array based upon which entity, i.e. files or folders, should come first
  switch (organizeFirst) {
    case "folders":
      sortedTitlesArray = sortedFoldersArray.concat(sortedFilesArray);
    break;
    case "files":
      sortedTitlesArray = sortedFilesArray.concat(sortedFoldersArray);
    break;
  }

  // return the sorted array of bookmark titles
  return sortedTitlesArray;
}


// this function will take an array of bookmark children nodes & return an array of those nodes sorted according to the sorted array of titles passed into the function
function sortChildrenByTitleArray(sortedTitlesArray,childrenArray) {
  let sortedChildrenArray = [];

  // ensure that both arrays passed into the function have the same number of items
  if (sortedTitlesArray.length == childrenArray.length) {

    // loop through our sorted titles list, so we can sort the actual bookmark objects
    for (let titleString of sortedTitlesArray) {

      // loop through our actual bookmark objects
      for (let childNode of childrenArray) {

        // compare the titles and if they are the same, push the bookmark object onto the new sorted array
        if (titleString == childNode.title) {
          sortedChildrenArray.push(childNode);
        }
      }
    }
  }

  // return the sorted array back to the caller
  return sortedChildrenArray;
}


// If the function to retrieve bookmarks should fail, alert the user
function onFailure(error) {
  alert(error);
}