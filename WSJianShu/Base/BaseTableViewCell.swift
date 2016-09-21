//
//  BaseTableViewCell.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/21.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit


class BaseTableViewCell: UITableViewCell {
    
    lazy var topSepLine : UIView = {
        let view = ViewUtils.getSepLine()
        // TODO: set view frame with snapKit
        return view
    }()
    
    lazy var bottomSepLine : UIView = {
        let view = ViewUtils.getSepLine()
        // TODO: set view frame with snapKit
        return view
    }()
    
    
}
