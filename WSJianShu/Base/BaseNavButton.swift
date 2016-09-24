//
//  BaseNavButton.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/23.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit

enum BaseNavButtonPositionType : Int {
    case left
    case right
    case secRight
}

class BaseNavButton: UIButton {

    var horizontalOffset: CGFloat = 8.0
    var type : BaseNavButtonPositionType = .left
    
    class func navButton(type: BaseNavButtonPositionType = .left) -> BaseNavButton {
        let item = BaseNavButton()
        item.type = type
        return item
    }
    
    override var frame: CGRect {
        didSet {
            let width = UIScreen.main.bounds.width
            switch type {
            case .left:
                super.frame = CGRect(x: horizontalOffset, y: frame.origin.y, width: frame.width, height: frame.height)
            case .right:
                super.frame = CGRect(x: width - frame.width - horizontalOffset, y: frame.origin.y, width: frame.width, height: frame.height)
            case .secRight:
                super.frame = CGRect(x: width - frame.width*2.0 - horizontalOffset*2.0, y: frame.origin.y, width: frame.width, height: frame.height)
            }
        }
    }
}
